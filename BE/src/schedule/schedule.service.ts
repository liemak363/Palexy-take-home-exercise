import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ScheduleRepository } from './schedule.repository';
import { ScheduleQueryDto } from './dto/schedule-query.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import {
  DayOfWeek,
  HourlyTransaction,
  UploadedTransactions,
} from './types/uploaded-transactions.type';
import { UpdateShiftDefinitionDto } from './dto/update-shift-definition.dto';
import { ShiftDefinition } from './types/shift-definition.type';

// ---------------------------------------------------------------------------
// CSV helpers (pure functions — no external dependency)
// ---------------------------------------------------------------------------

/** Parse a single CSV row that may contain quoted fields. */
function parseCsvRow(line: string): string[] {
  const cells: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (i === line.length) {
      // trailing empty cell after final comma handled above; break
      break;
    }
    if (line[i] === '"') {
      let val = '';
      i++; // skip opening quote
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          val += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++; // skip closing quote
          break;
        } else {
          val += line[i++];
        }
      }
      cells.push(val);
      if (i < line.length && line[i] === ',') i++; // skip comma
    } else {
      let val = '';
      while (i < line.length && line[i] !== ',') val += line[i++];
      cells.push(val);
      if (i < line.length && line[i] === ',') i++; // skip comma
    }
  }
  return cells;
}

/** Convert a 12-hour label (e.g. "7am", "12pm") to "HH:mm". Returns null on failure. */
function parseHourLabel(label: string): string | null {
  const match = label.trim().match(/^(\d{1,2})(am|pm)$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const meridiem = match[2].toLowerCase();
  if (hour < 1 || hour > 12) return null;
  if (meridiem === 'am') {
    hour = hour === 12 ? 0 : hour;
  } else {
    hour = hour === 12 ? 12 : hour + 12;
  }
  return `${String(hour).padStart(2, '0')}:00`;
}

const DAY_NAME_MAP: Record<string, DayOfWeek> = {
  mon: 'MONDAY',
  tue: 'TUESDAY',
  wed: 'WEDNESDAY',
  thu: 'THURSDAY',
  fri: 'FRIDAY',
  sat: 'SATURDAY',
  sun: 'SUNDAY',
};

const ALL_DAYS: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

/**
 * Parse and normalize a transaction CSV buffer into the canonical
 * `UploadedTransactions` structure.  Throws `BadRequestException` on any
 * validation failure so the caller gets a clear 400 response.
 */
function parseAndNormalizeCsv(buffer: Buffer): UploadedTransactions {
  const raw = buffer.toString('utf-8');
  // Strip UTF-8 BOM (U+FEFF) that some exporters (Excel, Sheets) prepend.
  const text = raw.startsWith('\uFEFF') ? raw.slice(1) : raw;
  // Normalise line-endings and drop blank lines
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim() !== '');

  if (lines.length < 3) {
    throw new BadRequestException(
      'CSV must have a metadata row, a header row, and at least one data row.',
    );
  }

  // Line 0: date-range metadata — skip.
  // Line 1: column headers  →  [empty, dayHeader1, …, dayHeader7]
  const headerCells = parseCsvRow(lines[1]);
  const dayHeaders = headerCells.slice(1); // drop the hour-label column

  if (dayHeaders.length !== 7) {
    throw new BadRequestException(
      `Expected 7 day columns in the header row, found ${dayHeaders.length}.`,
    );
  }

  // Map each header cell to a canonical DayOfWeek
  const columnDays: DayOfWeek[] = dayHeaders.map((header, idx) => {
    const match = header.trim().match(/^([A-Za-z]{3})/);
    if (!match) {
      throw new BadRequestException(
        `Cannot parse day name from header "${header}" (column ${idx + 2}).`,
      );
    }
    const key = match[1].toLowerCase();
    const day = DAY_NAME_MAP[key];
    if (!day) {
      throw new BadRequestException(
        `Unknown day abbreviation "${match[1]}" in header "${header}".`,
      );
    }
    return day;
  });

  // Ensure all 7 days are unique
  if (new Set(columnDays).size !== 7) {
    throw new BadRequestException(
      'Day columns must represent all 7 unique days of the week.',
    );
  }

  // Initialise result map
  const days = Object.fromEntries(
    ALL_DAYS.map((d) => [d, [] as HourlyTransaction[]]),
  ) as Record<DayOfWeek, HourlyTransaction[]>;

  // Parse data rows (line 2 onwards)
  for (let i = 2; i < lines.length; i++) {
    const cells = parseCsvRow(lines[i]);

    if (cells.length < 8) {
      throw new BadRequestException(
        `Row ${i + 1} has only ${cells.length} column(s); expected at least 8.`,
      );
    }

    const hour = parseHourLabel(cells[0]);
    if (!hour) {
      throw new BadRequestException(
        `Invalid hour label "${cells[0]}" on row ${i + 1}. Expected format: 7am, 12pm, etc.`,
      );
    }

    for (let j = 0; j < 7; j++) {
      const raw = cells[j + 1].trim();
      const count = Number(raw);
      if (!Number.isInteger(count) || count < 0 || raw === '') {
        throw new BadRequestException(
          `Invalid transaction count "${raw}" on row ${i + 1}, column ${j + 2}. Must be a non-negative integer.`,
        );
      }
      days[columnDays[j]].push({ hour, transactions: count });
    }
  }

  // Sort each day's entries chronologically
  for (const day of ALL_DAYS) {
    days[day].sort((a, b) => a.hour.localeCompare(b.hour));
  }

  return { version: 1, days };
}

// ---------------------------------------------------------------------------
// Shift definition validation helpers
// ---------------------------------------------------------------------------

const DAY_START = '07:00';
const DAY_END = '23:00';

/**
 * Validate that the provided shift slots:
 *  - Have no slot where start >= end
 *  - Together cover exactly 07:00–23:00 with no gaps or overlaps
 *
 * Returns the sorted, validated definition (sorted by start time).
 */
function validateAndSortShiftDefinition(
  dto: UpdateShiftDefinitionDto,
): ShiftDefinition {
  const sorted = [...dto.shifts].sort((a, b) => a.start.localeCompare(b.start));

  // Validate individual slots
  for (const slot of sorted) {
    if (slot.start >= slot.end) {
      throw new BadRequestException(
        `Shift start must be before end: ${slot.start}–${slot.end}.`,
      );
    }
  }

  // Check first and last boundaries
  if (sorted[0].start !== DAY_START) {
    throw new BadRequestException(`Shifts must start at ${DAY_START}.`);
  }
  if (sorted[sorted.length - 1].end !== DAY_END) {
    throw new BadRequestException(`Shifts must end at ${DAY_END}.`);
  }

  // Check for gaps and overlaps between consecutive slots
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = sorted[i - 1].end;
    const curStart = sorted[i].start;
    if (prevEnd < curStart) {
      throw new BadRequestException(
        `Gap between shifts: ${prevEnd}–${curStart}.`,
      );
    }
    if (prevEnd > curStart) {
      throw new BadRequestException(
        `Overlapping shifts: ${prevEnd} > ${curStart}.`,
      );
    }
  }

  return sorted;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class ScheduleService {
  constructor(private readonly scheduleRepository: ScheduleRepository) {}

  async findAll(query: ScheduleQueryDto) {
    return this.scheduleRepository.findAll(query);
  }

  async findById(id: number) {
    const schedule = await this.scheduleRepository.findById(id);
    if (!schedule) {
      throw new NotFoundException(`Schedule #${id} not found.`);
    }
    return schedule;
  }

  async create(dto: CreateScheduleDto) {
    // Parse the date parts from the ISO string without timezone involvement.
    // The client sends "YYYY-MM-DD"; we treat it as a plain local-calendar date.
    const [year, month, day] = dto.startDate.split('-').map(Number);

    // Build a Date using UTC midnight to avoid any DST/timezone shifts.
    const inputDate = new Date(Date.UTC(year, month - 1, day));

    // Snap to the nearest previous (or same-day) Monday.
    // getUTCDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
    const dayOfWeek = inputDate.getUTCDay();
    // Days to subtract to reach Monday: Mon=0, Tue=1, ..., Sun=6
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(inputDate);
    monday.setUTCDate(inputDate.getUTCDate() - daysToSubtract);

    // default shifts are 07:00-15:00 and 15:00-23:00
    const defaultShiftDefinition: ShiftDefinition = [
      { start: '07:00', end: '15:00' },
      { start: '15:00', end: '23:00' },
    ];

    return this.scheduleRepository.create(monday, defaultShiftDefinition);
  }

  async findShiftsById(id: number) {
    return this.scheduleRepository.findShiftsById(id);
  }

  async uploadTxns(
    id: number,
    fileBuffer: Buffer,
  ): Promise<UploadedTransactions> {
    // Ensure the schedule exists before doing any parsing work
    await this.findById(id);

    const txns = parseAndNormalizeCsv(fileBuffer);
    await this.scheduleRepository.updateUploadedTxns(id, txns);
    return txns;
  }

  async updateShiftDefinition(
    id: number,
    dto: UpdateShiftDefinitionDto,
  ): Promise<ShiftDefinition> {
    await this.findById(id);

    const definition = validateAndSortShiftDefinition(dto);
    await this.scheduleRepository.updateShiftDefinition(id, definition);
    return definition;
  }
}
