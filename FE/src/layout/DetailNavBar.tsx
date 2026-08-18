"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

export interface NavTab {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

export interface DetailNavBarProps {
  navItems?: NavItem[];
  tabs?: NavTab[];
}

export default function DetailNavBar({ navItems, tabs }: DetailNavBarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const items: NavItem[] = (navItems || tabs || []).map((t) => ({
    label: t.label,
    path: "path" in t ? (t as NavItem).path : (t as NavTab).href,
    icon: t.icon,
  }));

  const isActiveTab = useCallback(
    (path: string) => {
      const matchingPaths = items
        .filter((item) => pathname === item.path || pathname.startsWith(item.path + "/"))
        .map((item) => item.path);

      if (matchingPaths.length === 0) return false;

      const longestMatch = matchingPaths.reduce((longest, current) =>
        current.length > longest.length ? current : longest
      );

      return path === longestMatch;
    },
    [pathname, items]
  );

  if (items.length === 0) return null;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="mb-6 border-b border-gray-200 bg-white/90 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/90 rounded-xl px-3 py-1.5 shadow-xs">
      <div>
        {/* Mobile Toggle Button */}
        <div className="flex items-center justify-between py-2 lg:hidden">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Navigation
          </h2>
          <button
            onClick={toggleMobileMenu}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Navigation - Desktop always visible, Mobile toggle */}
        <nav
          className={`${isMobileMenuOpen ? "block" : "hidden"} lg:block`}
          aria-label="Tab"
        >
          {/* Desktop Navigation - Horizontal */}
          <div className="hidden lg:flex space-x-3 py-1">
            {items.map((item) => {
              const active = isActiveTab(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 border border-brand-200/80 dark:border-brand-800/80 shadow-xs"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                  }`}
                >
                  {item.icon && (
                    <span>
                      {item.icon}
                    </span>
                  )}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Navigation - Vertical */}
          <div className="flex flex-col space-y-1 py-2 lg:hidden">
            {items.map((item) => {
              const active = isActiveTab(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 w-full ${
                    active
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 border border-brand-200/80 dark:border-brand-800/80"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                  }`}
                >
                  {item.icon && (
                    <span>
                      {item.icon}
                    </span>
                  )}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
