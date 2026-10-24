package com.raboul.journal;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Full-text search over the journal's daily entries ({@code state.days}) and notes pages
 * ({@code state.notes}).
 *
 * <p>Rules, kept simple so they are easy to follow:
 * <ul>
 *   <li>The query is split into words; an entry matches only if it contains <b>all</b> of them.</li>
 *   <li>Matching ignores upper/lower case.</li>
 *   <li>Better matches (more occurrences) come first; ties show the newest day first.</li>
 * </ul>
 *
 * <p>This class works on a {@link JsonNode} and holds no state, which makes it trivial to unit test.
 */
@Service
public class SearchService {

    private static final int MAX_TERMS = 8;
    private static final int MAX_LIMIT = 100;
    private static final DateTimeFormatter DAY_TITLE = DateTimeFormatter.ofPattern("EEE, MMM d, yyyy", Locale.ENGLISH);

    /** A hit plus what we need to sort it. */
    private record Scored(SearchHit hit, int score, String sortKey) {
    }

    public List<SearchHit> search(JsonNode state, String query, int limit) {
        List<String> terms = terms(query);
        if (state == null || terms.isEmpty()) {
            return List.of();
        }
        int max = Math.max(1, Math.min(limit, MAX_LIMIT));
        List<Scored> found = new ArrayList<>();

        // Daily entries: { "2026-01-05": "text", ... }
        for (Map.Entry<String, JsonNode> e : state.path("days").properties()) {
            String text = e.getValue().asText("");
            int score = score(text, terms);
            if (score > 0) {
                found.add(new Scored(new SearchHit("day", e.getKey(), dayTitle(e.getKey()),
                        snippet(text, terms.get(0)), "#/day/" + e.getKey()), score, e.getKey()));
            }
        }
        // Notes pages: { "<tabId>": "text", ... }; the page's name comes from state.tabs.
        for (Map.Entry<String, JsonNode> e : state.path("notes").properties()) {
            String text = e.getValue().asText("");
            int score = score(text, terms);
            if (score > 0) {
                found.add(new Scored(new SearchHit("note", e.getKey(), tabName(state, e.getKey()),
                        snippet(text, terms.get(0)), "#/tab/" + e.getKey()), score, ""));
            }
        }

        found.sort(Comparator.comparingInt(Scored::score).reversed()
                .thenComparing(Comparator.comparing(Scored::sortKey).reversed()));
        return found.stream().limit(max).map(Scored::hit).toList();
    }

    /** Lower-cased words of the query (blank query gives an empty list). */
    static List<String> terms(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        return List.of(query.toLowerCase(Locale.ROOT).trim().split("\\s+")).stream().limit(MAX_TERMS).toList();
    }

    /** 0 if any word is missing; otherwise the total number of times the words occur. */
    static int score(String text, List<String> terms) {
        String lower = text.toLowerCase(Locale.ROOT);
        int total = 0;
        for (String term : terms) {
            int count = 0;
            for (int i = lower.indexOf(term); i >= 0; i = lower.indexOf(term, i + term.length())) {
                count++;
            }
            if (count == 0) {
                return 0;
            }
            total += count;
        }
        return total;
    }

    /** About 100 characters of text around the first occurrence of {@code term}. */
    static String snippet(String text, String term) {
        int at = text.toLowerCase(Locale.ROOT).indexOf(term);
        at = Math.max(0, Math.min(at, text.length()));
        int start = Math.max(0, at - 40);
        int end = Math.min(text.length(), at + term.length() + 60);
        String body = text.substring(start, end).replaceAll("\\s+", " ").trim();
        return (start > 0 ? "…" : "") + body + (end < text.length() ? "…" : "");
    }

    private static String dayTitle(String isoDate) {
        try {
            return LocalDate.parse(isoDate).format(DAY_TITLE);
        } catch (DateTimeParseException e) {
            return isoDate;
        }
    }

    private static String tabName(JsonNode state, String tabId) {
        for (JsonNode tab : state.path("tabs")) {
            if (tabId.equals(tab.path("id").asText())) {
                return tab.path("name").asText("Notes page");
            }
        }
        return "Notes page";
    }
}
