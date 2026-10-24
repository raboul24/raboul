package com.raboul.journal;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * The REST API the web app talks to. A controller only translates between HTTP and our Java code:
 * it reads the request, calls {@link JournalStore} / {@link SearchService}, and picks a status code.
 * The real work lives in those classes, which keeps this one short.
 *
 * <pre>
 *   GET /api/health                       is the server there? (the app checks this first)
 *   GET /api/journal                      200 + the saved journal, or 404 if none saved yet
 *   PUT /api/journal?baseRevision=N       200 + new revision, 409 if the server has a newer one, 400 if invalid
 *   GET /api/search?q=words&amp;limit=20       matching entries and notes pages
 * </pre>
 */
@RestController
@RequestMapping("/api")
public class JournalController {

    private final JournalStore store;
    private final SearchService search;

    public JournalController(JournalStore store, SearchService search) {
        this.store = store;
        this.search = search;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        // The app checks "service" so it does not mistake some other server on the same address for ours.
        return Map.of("status", "ok", "service", "journal-backend");
    }

    @GetMapping("/journal")
    public ResponseEntity<StoredJournal> load() {
        return store.load().map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/journal")
    public SaveResult save(@RequestBody JsonNode state, @RequestParam(defaultValue = "0") long baseRevision) {
        return store.save(state, baseRevision);
    }

    @GetMapping("/search")
    public List<SearchHit> search(@RequestParam String q, @RequestParam(defaultValue = "20") int limit) {
        JsonNode state = store.load().map(StoredJournal::state).orElse(null);
        return search.search(state, q, limit);
    }

    // ---- turning exceptions into HTTP answers ----

    /** 409 Conflict. The body is the server's current copy so the app can offer to use it. */
    @ExceptionHandler(RevisionConflictException.class)
    public ResponseEntity<StoredJournal> conflict(RevisionConflictException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(e.current());
    }

    /** 400 Bad Request, e.g. the body was not a journal. */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> badRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", String.valueOf(e.getMessage())));
    }
}
