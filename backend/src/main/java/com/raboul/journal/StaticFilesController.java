package com.raboul.journal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

/**
 * Serves the existing web app (index.html, app.js, ...) from the repo root, so that one command starts
 * both the app and the API, and the app can call "/api/..." on its own address (no CORS setup needed).
 *
 * <p>Security: the repo root also contains backend/, .git/ and your data, none of which may be served.
 * So instead of exposing a whole folder we only answer for an <b>allow-list</b> of file names, and we
 * double-check that the resolved path really stays inside the web root.
 */
@RestController
public class StaticFilesController {

    private static final Map<String, MediaType> TYPES = Map.of(
            "html", MediaType.TEXT_HTML,
            "js", MediaType.parseMediaType("text/javascript"),
            "css", MediaType.parseMediaType("text/css"),
            "ttf", MediaType.parseMediaType("font/ttf"),
            "txt", MediaType.TEXT_PLAIN);

    private final Path root;

    public StaticFilesController(@Value("${journal.web-root:..}") String webRoot) {
        this.root = Path.of(webRoot).toAbsolutePath().normalize();
    }

    @GetMapping("/")
    public ResponseEntity<Resource> home() {
        return serve("index.html");
    }

    /** Browsers always ask for an icon; answer "none" (204) so the console stays free of 404 noise. */
    @GetMapping("/favicon.ico")
    public ResponseEntity<Void> noFavicon() {
        return ResponseEntity.noContent().build();
    }

    /** The five top-level files of the app. Anything else at the top level is a 404. */
    @GetMapping("/{name:index\\.html|app\\.js|pdf\\.js|covers\\.js|styles\\.css}")
    public ResponseEntity<Resource> appFile(@PathVariable String name) {
        return serve(name);
    }

    /** Fonts and their licenses. The pattern allows no slashes, so ".." tricks cannot match. */
    @GetMapping("/fonts/{name:[A-Za-z0-9_-]+\\.(?:ttf|js|txt)}")
    public ResponseEntity<Resource> font(@PathVariable String name) {
        return serve("fonts/" + name);
    }

    private ResponseEntity<Resource> serve(String relative) {
        Path file = root.resolve(relative).normalize();
        if (!file.startsWith(root) || !Files.isRegularFile(file)) {
            return ResponseEntity.notFound().build();
        }
        String name = file.getFileName().toString();
        MediaType type = TYPES.getOrDefault(name.substring(name.lastIndexOf('.') + 1), MediaType.APPLICATION_OCTET_STREAM);
        // no-cache: always re-check, so edits to app.js show up on the next reload while you develop.
        return ResponseEntity.ok().contentType(type).cacheControl(CacheControl.noCache()).body(new FileSystemResource(file));
    }
}
