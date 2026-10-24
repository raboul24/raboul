package com.raboul.journal;

/**
 * Thrown when someone tries to save on top of an out-of-date copy.
 *
 * <p>Example: the laptop and the iPad both loaded revision 4. The laptop saves (now revision 5). When the
 * iPad then tries to save "on top of revision 4", we refuse instead of silently erasing the laptop's work.
 * The controller turns this into HTTP 409 and sends back the current copy so the app can ask the user.
 */
public class RevisionConflictException extends RuntimeException {

    private final transient StoredJournal current;

    public RevisionConflictException(StoredJournal current) {
        super("The journal was changed on the server (now at revision " + current.revision() + ")");
        this.current = current;
    }

    /** The copy that is on the server right now. */
    public StoredJournal current() {
        return current;
    }
}
