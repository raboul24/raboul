package com.raboul.journal;

/**
 * One search result. It carries everything the front end needs to show and open it:
 *
 * @param type    "day" (a daily entry) or "note" (a notes page)
 * @param key     the date ("2026-01-05") or the tab id of the notes page
 * @param title   human-friendly heading, e.g. "Mon, Jan 5, 2026" or the notes tab's name
 * @param snippet a short piece of the text around the match
 * @param href    the in-app link, e.g. "#/day/2026-01-05"; the front end's existing router opens it
 */
public record SearchHit(String type, String key, String title, String snippet, String href) {
}
