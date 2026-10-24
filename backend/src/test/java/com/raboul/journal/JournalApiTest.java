package com.raboul.journal;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Path;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests the whole HTTP layer: real Spring app, fake HTTP requests ({@link MockMvc}), and a throw-away
 * data folder. This checks the status codes and JSON the web app depends on.
 *
 * <p>One method runs the whole story in order (empty, save, load, conflict, search) because the steps
 * build on each other and the server keeps its state between requests.
 */
@SpringBootTest
@AutoConfigureMockMvc
class JournalApiTest {

    @TempDir
    static Path dataDir;

    /** Point the app at the temp folder (and at the repo root for the static files) before it starts. */
    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("journal.data-dir", () -> dataDir.toString());
        registry.add("journal.web-root", () -> Path.of(System.getProperty("user.dir"), "..").toString());
    }

    @Autowired
    MockMvc mvc;

    private static final String JOURNAL = """
            {"title":"Test","tabs":[{"id":"n1","name":"Goals","kind":"notes"}],
             "days":{"2026-01-05":"Dentist appointment"},"notes":{"n1":"Learn Java"}}""";

    @Test
    void healthSaysWhoWeAre() throws Exception {
        mvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.service").value("journal-backend"));
    }

    @Test
    void theWholeSaveLoadConflictSearchStory() throws Exception {
        // 1. nothing saved yet
        mvc.perform(get("/api/journal")).andExpect(status().isNotFound());

        // 2. first save (base revision 0) becomes revision 1
        mvc.perform(put("/api/journal?baseRevision=0").contentType(MediaType.APPLICATION_JSON).content(JOURNAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revision").value(1));

        // 3. load it back
        mvc.perform(get("/api/journal"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revision").value(1))
                .andExpect(jsonPath("$.state.title").value("Test"));

        // 4. a second save on top of revision 1 works, then a stale one is refused with 409 + the current copy
        mvc.perform(put("/api/journal?baseRevision=1").contentType(MediaType.APPLICATION_JSON).content(JOURNAL))
                .andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(2));
        mvc.perform(put("/api/journal?baseRevision=1").contentType(MediaType.APPLICATION_JSON).content(JOURNAL))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.revision").value(2))
                .andExpect(jsonPath("$.state.title").value("Test"));

        // 5. search finds the day entry and the notes page
        mvc.perform(get("/api/search?q=dentist"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].type").value("day"))
                .andExpect(jsonPath("$[0].href").value("#/day/2026-01-05"));
        mvc.perform(get("/api/search?q=java"))
                .andExpect(jsonPath("$[0].title").value("Goals"))
                .andExpect(jsonPath("$[0].href").value("#/tab/n1"));
        mvc.perform(get("/api/search?q=zebra")).andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void invalidJournalIsABadRequest() throws Exception {
        mvc.perform(put("/api/journal").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"no tabs\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    // ---- static files: the app is served, everything else is not ----

    @Test
    void servesTheAppFilesWithTheRightTypes() throws Exception {
        mvc.perform(get("/")).andExpect(status().isOk()).andExpect(content().contentTypeCompatibleWith("text/html"));
        mvc.perform(get("/app.js")).andExpect(status().isOk()).andExpect(content().contentTypeCompatibleWith("text/javascript"));
        mvc.perform(get("/styles.css")).andExpect(status().isOk()).andExpect(content().contentTypeCompatibleWith("text/css"));
        mvc.perform(get("/fonts/Lora.ttf")).andExpect(status().isOk()).andExpect(content().contentTypeCompatibleWith("font/ttf"));
    }

    @Test
    void doesNotServeAnythingOutsideTheAllowList() throws Exception {
        mvc.perform(get("/backend/pom.xml")).andExpect(status().isNotFound());
        mvc.perform(get("/PLAN.md")).andExpect(status().isNotFound());
        mvc.perform(get("/.git/config")).andExpect(status().isNotFound());
        mvc.perform(get("/fonts/../PLAN.md")).andExpect(status().isNotFound());
        mvc.perform(get("/fonts/%2e%2e%2fPLAN.md")).andExpect(status().isNotFound());
        mvc.perform(get("/fonts/nope.ttf")).andExpect(status().isNotFound());
    }

    @Test
    void answersTheBrowsersIconRequestWithNoContent() throws Exception {
        mvc.perform(get("/favicon.ico")).andExpect(status().isNoContent());
    }
}
