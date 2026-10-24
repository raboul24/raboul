package com.raboul.journal;

/**
 * The small reply to a successful save. We do not send the whole journal back (it can be megabytes);
 * the app only needs the new revision number to use as its next "base revision".
 */
public record SaveResult(long revision, String savedAt) {
}
