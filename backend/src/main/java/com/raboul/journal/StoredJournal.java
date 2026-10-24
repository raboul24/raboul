package com.raboul.journal;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * What is written to {@code data/journal.json}: the whole journal exactly as the web app keeps it
 * in localStorage ({@code state}), wrapped with bookkeeping.
 *
 * <p>Why a {@code JsonNode} instead of a Java class with a field per setting? The front end owns the
 * shape of the journal (themes, tabs, fonts, ...). Keeping it as raw JSON means the front end can add
 * a new option without the Java code needing a change, and nothing is ever lost on the way through.
 *
 * <p>{@code revision} goes up by one on every save. The app sends the revision it last saw, which is how
 * the server notices that another device saved in the meantime (see {@link RevisionConflictException}).
 *
 * @param revision 1, 2, 3, ... (0 means "nothing saved yet" and is never stored)
 * @param savedAt  ISO-8601 time of the save, shown to the user in the conflict dialog
 * @param state    the journal JSON
 */
public record StoredJournal(long revision, String savedAt, JsonNode state) {
}
