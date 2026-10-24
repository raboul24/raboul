package com.raboul.journal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import static java.nio.file.StandardCopyOption.ATOMIC_MOVE;
import static java.nio.file.StandardCopyOption.REPLACE_EXISTING;

/**
 * Keeps the journal on disk as plain JSON files, so there is no database to install.
 *
 * <pre>
 *   data/journal.json                 the current journal   (a {@link StoredJournal})
 *   data/backups/journal-000007.json  the last 10 older versions (a safety net against a bad save)
 * </pre>
 *
 * <p>Two things are done on purpose:
 * <ul>
 *   <li><b>Safe writes.</b> We write to a temporary file first and then rename it over journal.json.
 *       A rename is all-or-nothing, so a crash mid-save can never leave a half-written journal.</li>
 *   <li><b>Revision check.</b> Every save says which revision it was based on. If the server has moved
 *       on, we refuse with {@link RevisionConflictException} rather than overwrite someone's changes.</li>
 * </ul>
 *
 * <p>All public methods are {@code synchronized}: two requests arriving at the same moment are handled
 * one after the other, so the revision counter cannot get out of step.
 */
@Component
public class JournalStore {

    /** How many older versions to keep in data/backups/. */
    static final int MAX_BACKUPS = 10;
    /** Refuse absurdly large journals (the app's own journals are well under a few MB). */
    static final int MAX_STATE_CHARS = 25 * 1024 * 1024;

    private final ObjectMapper mapper;
    private final Path file;
    private final Path backups;

    public JournalStore(ObjectMapper mapper, @Value("${journal.data-dir:data}") String dataDir) throws IOException {
        this.mapper = mapper;
        Path dir = Path.of(dataDir).toAbsolutePath().normalize();
        this.file = dir.resolve("journal.json");
        this.backups = dir.resolve("backups");
        Files.createDirectories(backups);
    }

    /** The saved journal, or empty if nothing has been saved yet. */
    public synchronized Optional<StoredJournal> load() {
        if (!Files.exists(file)) {
            return Optional.empty();
        }
        try {
            return Optional.of(mapper.readValue(file.toFile(), StoredJournal.class));
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read " + file, e);
        }
    }

    /**
     * Saves a new version.
     *
     * @param state        the journal JSON from the app
     * @param baseRevision the revision the app was looking at (0 if it has never synced)
     * @return the new revision and save time
     * @throws RevisionConflictException if the server already holds a different revision
     * @throws IllegalArgumentException  if {@code state} does not look like a journal
     */
    public synchronized SaveResult save(JsonNode state, long baseRevision) {
        validate(state);
        Optional<StoredJournal> current = load();

        // If the file was deleted but the app still remembers a revision, the app's copy is the only
        // copy: accept it. Otherwise the revisions must match.
        if (current.isPresent() && current.get().revision() != baseRevision) {
            throw new RevisionConflictException(current.get());
        }

        long nextRevision = current.map(c -> c.revision() + 1).orElse(1L);
        String savedAt = Instant.now().toString();
        try {
            Files.createDirectories(backups);      // also the data folder; they may have been deleted while we were running
            current.ifPresent(c -> backUp(c.revision()));
            Path tmp = file.resolveSibling("journal.json.tmp");
            mapper.writeValue(tmp.toFile(), new StoredJournal(nextRevision, savedAt, state));
            Files.move(tmp, file, ATOMIC_MOVE, REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not save " + file, e);
        }
        return new SaveResult(nextRevision, savedAt);
    }

    /** Copies the current journal.json into backups/ and deletes the oldest copies beyond MAX_BACKUPS. */
    private void backUp(long revision) {
        try {
            Path copy = backups.resolve(String.format("journal-%06d.json", revision));
            Files.copy(file, copy, StandardCopyOption.REPLACE_EXISTING);
            try (Stream<Path> all = Files.list(backups)) {
                // Names sort in revision order because the number is zero-padded.
                List<Path> sorted = all.filter(p -> p.getFileName().toString().startsWith("journal-"))
                        .sorted().toList();
                for (int i = 0; i < sorted.size() - MAX_BACKUPS; i++) {
                    Files.deleteIfExists(sorted.get(i));
                }
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Could not write a backup", e);
        }
    }

    /** A journal must be a JSON object with a "tabs" array (the one thing every journal has). */
    private static void validate(JsonNode state) {
        if (state == null || !state.isObject() || !state.path("tabs").isArray()) {
            throw new IllegalArgumentException("A journal must be a JSON object with a 'tabs' array");
        }
        if (state.toString().length() > MAX_STATE_CHARS) {
            throw new IllegalArgumentException("Journal is too large");
        }
    }

    /** Where the files live (used by tests and the README's "where is my data" answer). */
    Path file() {
        return file;
    }

    Path backupsDir() {
        return backups;
    }
}
