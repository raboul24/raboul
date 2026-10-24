package com.raboul.journal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests {@link JournalStore} against a throw-away folder ({@code @TempDir}), so the real
 * data/ folder is never touched. Each test follows the same shape: arrange, act, assert.
 */
class JournalStoreTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private JournalStore store;

    @TempDir
    Path dir;

    @BeforeEach
    void setUp() throws IOException {
        store = new JournalStore(mapper, dir.toString());
    }

    private JsonNode journal(String title) throws IOException {
        return mapper.readTree("{\"title\":\"" + title + "\",\"tabs\":[]}");
    }

    @Test
    void emptyAtFirst() {
        assertTrue(store.load().isEmpty());
    }

    @Test
    void firstSaveIsRevisionOneAndCanBeLoaded() throws IOException {
        SaveResult result = store.save(journal("A"), 0);

        assertEquals(1, result.revision());
        StoredJournal loaded = store.load().orElseThrow();
        assertEquals(1, loaded.revision());
        assertEquals("A", loaded.state().path("title").asText());
        assertEquals(result.savedAt(), loaded.savedAt());
    }

    @Test
    void eachSaveBasedOnTheLatestRevisionAddsOne() throws IOException {
        store.save(journal("A"), 0);
        assertEquals(2, store.save(journal("B"), 1).revision());
        assertEquals(3, store.save(journal("C"), 2).revision());
        assertEquals("C", store.load().orElseThrow().state().path("title").asText());
    }

    @Test
    void savingOnTopOfAnOldRevisionIsRefusedAndNothingIsOverwritten() throws IOException {
        store.save(journal("laptop v1"), 0);
        store.save(journal("laptop v2"), 1);               // server is now at revision 2

        RevisionConflictException conflict =
                assertThrows(RevisionConflictException.class, () -> store.save(journal("ipad"), 1)); // iPad still on 1

        assertEquals(2, conflict.current().revision());
        assertEquals("laptop v2", store.load().orElseThrow().state().path("title").asText());
    }

    @Test
    void ifTheServerFileWasDeletedTheAppsCopyIsAccepted() throws IOException {
        store.save(journal("A"), 0);
        Files.delete(store.file());

        assertEquals(1, store.save(journal("B"), 5).revision());
    }

    @Test
    void rejectsThingsThatAreNotJournals() throws IOException {
        assertThrows(IllegalArgumentException.class, () -> store.save(mapper.readTree("[1,2,3]"), 0));
        assertThrows(IllegalArgumentException.class, () -> store.save(mapper.readTree("{\"title\":\"no tabs\"}"), 0));
        assertThrows(IllegalArgumentException.class, () -> store.save(mapper.readTree("{\"tabs\":\"nope\"}"), 0));
        assertThrows(IllegalArgumentException.class, () -> store.save(null, 0));
        assertTrue(store.load().isEmpty());
    }

    @Test
    void keepsOnlyTheLastTenBackups() throws IOException {
        long revision = 0;
        for (int i = 0; i < 15; i++) {
            revision = store.save(journal("v" + i), revision).revision();
        }
        try (Stream<Path> backups = Files.list(store.backupsDir())) {
            assertEquals(JournalStore.MAX_BACKUPS, backups.count());
        }
        // The newest backup is the version just before the current one (revision 14 of 15).
        assertTrue(Files.exists(store.backupsDir().resolve("journal-000014.json")));
        assertFalse(Files.exists(store.backupsDir().resolve("journal-000001.json")));
    }

    @Test
    void aBackupHoldsThePreviousContent() throws IOException {
        store.save(journal("before"), 0);
        store.save(journal("after"), 1);

        JsonNode backup = mapper.readTree(store.backupsDir().resolve("journal-000001.json").toFile());
        assertEquals("before", backup.path("state").path("title").asText());
    }

    @Test
    void recreatesItsFoldersIfTheyAreDeletedWhileRunning() throws IOException {
        store.save(journal("A"), 0);
        try (Stream<Path> files = Files.walk(dir)) {                       // delete everything inside data/
            files.sorted(java.util.Comparator.reverseOrder()).filter(p -> !p.equals(dir)).forEach(p -> p.toFile().delete());
        }

        assertEquals(1, store.save(journal("B"), 1).revision());          // base 1 but the file is gone: app's copy accepted
        assertTrue(Files.exists(store.file()));
    }

    @Test
    void noTemporaryFileIsLeftBehind() throws IOException {
        store.save(journal("A"), 0);
        assertFalse(Files.exists(dir.resolve("journal.json.tmp")));
    }
}
