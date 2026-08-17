# Staff Scheduling System

## Goal

Build a web application that helps a store manager create a weekly
staff schedule based on historical transaction demand.

Higher-demand hours should generally have more staff, while respecting
staff maximum weekly hours and distributing work fairly.

## Core Concepts

### Schedule
Top-level container for:
- staff
- transaction data
- shifts
- generated roster

A schedule represents a typical Monday-Sunday week.

### Staff
- name
- maximum weekly hours
- can be added, edited, removed

### Transaction Data
Hourly transaction counts for each day of the week.
Transactions are used as a proxy for store demand.

The provided CSV covers 07:00–23:00.
Importer should tolerate reasonable variations and fail gracefully
on malformed input.

### Shift
A shift has:
- start time
- end time

Default shifts:
- 07:00–15:00
- 15:00–23:00

Staff are assigned to shifts, not individual hours.

## Auto-Scheduling

The scheduler should:

1. Estimate required staff from hourly demand.
2. Map hourly demand onto shifts.
3. Assign staff while respecting maximum weekly hours.
4. Distribute work fairly.
5. Surface under-staffing when available capacity is insufficient.

There is no single prescribed algorithm. The implementation should
make and document reasonable assumptions.

## Summary

For each day/hour show:

- Transactions
- Staff hours
- Transactions per staff hour

Weekly totals:

- Total staff hours
- Total transactions
- Overall transactions per staff hour
- Average per-cell transactions per staff hour

Avoid division by zero.

## Constraints

- Never exceed a staff member's maximum weekly hours.
- Staffing should respond to demand.
- Work should be reasonably balanced.
- Staff are assigned to shifts.
- Capacity mismatches should be visible to the manager.

## Scope

Core:
- create schedule
- manage staff
- upload transactions
- manage shifts
- auto-schedule
- view roster
- view aggregated summary

Out of scope:
- authentication
- multi-user support
- deployment

Optional/stretch:
- manual adjustment
- coverage visualization
- availability/days off
- roles/skills
- export