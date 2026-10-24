package com.raboul.journal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** Tests {@link SearchService} with a small hand-written journal. No files or web server involved. */
class SearchServiceTest {

    private final SearchService service = new SearchService();
    private final JsonNode state = parse("""
            {
              "tabs": [ {"id":"n1","name":"Goals","kind":"notes"}, {"id":"n2","name":"Recipes","kind":"notes"} ],
              "days": {
                "2026-01-05": "Dentist at 9am, then lunch with Sam",
                "2026-02-14": "Dinner reservation. Call the dentist again about the DENTIST bill",
                "2026-03-01": "Went for a run"
              },
              "notes": {
                "n1": "Learn Java this year.\\nBook a dentist check-up.",
                "n2": "Pancakes: flour, eggs, milk"
              }
            }
            """);

    private static JsonNode parse(String json) {
        try {
            return new ObjectMapper().readTree(json);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @Test
    void findsDaysAndNotesCaseInsensitively() {
        List<SearchHit> hits = service.search(state, "DenTist", 20);

        assertEquals(3, hits.size());
        assertTrue(hits.stream().anyMatch(h -> h.type().equals("note") && h.key().equals("n1")));
        assertTrue(hits.stream().anyMatch(h -> h.type().equals("day") && h.key().equals("2026-01-05")));
    }

    @Test
    void moreOccurrencesRankFirst() {
        List<SearchHit> hits = service.search(state, "dentist", 20);
        assertEquals("2026-02-14", hits.get(0).key());       // mentions it twice
    }

    @Test
    void tiesShowTheNewestDayFirst() {
        List<SearchHit> hits = service.search(state, "dentist", 20);
        // Both remaining matches have one occurrence: 2026-01-05 (day) and n1 (note, sorts after days by key "").
        assertEquals("2026-01-05", hits.get(1).key());
    }

    @Test
    void everyWordMustMatch() {
        assertEquals(1, service.search(state, "dentist sam", 20).size());
        assertTrue(service.search(state, "dentist pancakes", 20).isEmpty());
    }

    @Test
    void buildsHelpfulTitlesAndLinks() {
        SearchHit day = service.search(state, "lunch", 20).get(0);
        assertEquals("Mon, Jan 5, 2026", day.title());
        assertEquals("#/day/2026-01-05", day.href());

        SearchHit note = service.search(state, "pancakes", 20).get(0);
        assertEquals("Recipes", note.title());          // looked up from state.tabs
        assertEquals("#/tab/n2", note.href());
    }

    @Test
    void snippetShowsTextAroundTheMatch() {
        String text = "x".repeat(100) + " needle " + "y".repeat(100);
        String snippet = SearchService.snippet(text, "needle");

        assertTrue(snippet.contains("needle"));
        assertTrue(snippet.startsWith("…") && snippet.endsWith("…"));
        assertTrue(snippet.length() < 130);
        assertEquals("short text", SearchService.snippet("short text", "short").replace("…", ""));
    }

    @Test
    void blankOrMissingInputGivesNoResults() {
        assertTrue(service.search(state, "", 20).isEmpty());
        assertTrue(service.search(state, "   ", 20).isEmpty());
        assertTrue(service.search(state, null, 20).isEmpty());
        assertTrue(service.search(null, "dentist", 20).isEmpty());
        assertTrue(service.search(state, "zebra", 20).isEmpty());
    }

    @Test
    void limitIsAppliedAndClamped() {
        assertEquals(1, service.search(state, "dentist", 1).size());
        assertEquals(1, service.search(state, "dentist", 0).size());          // minimum of 1
        assertEquals(3, service.search(state, "dentist", 100000).size());     // capped, but there are only 3
    }

    @Test
    void aJournalWithoutDaysOrNotesDoesNotCrash() {
        assertTrue(service.search(parse("{\"tabs\":[]}"), "anything", 20).isEmpty());
    }
}
