/**
 * Rigr - Make graphics clickable to view full-size (implements 00305)
 */
document.addEventListener('DOMContentLoaded', function() {
    // Find all clickable graphic images
    document.querySelectorAll('.rigr-clickable img').forEach(function(img) {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', function() {
            window.open(img.src, '_blank');
        });
    });

    // Find all PlantUML diagrams (rendered as <object> with SVG)
    // Add a clickable overlay since <object> intercepts click events
    document.querySelectorAll('.rigr-graphic-uml .plantuml').forEach(function(container) {
        var obj = container.querySelector('object');
        if (obj) {
            // Create overlay div
            var overlay = document.createElement('div');
            overlay.className = 'rigr-uml-overlay';
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.cursor = 'zoom-in';
            overlay.title = 'Click to view full-size';

            // Make container relative for overlay positioning
            container.style.position = 'relative';
            container.style.display = 'inline-block';

            overlay.addEventListener('click', function() {
                window.open(obj.data, '_blank');
            });

            container.appendChild(overlay);
        }
    });

    // Also handle PlantUML fallback images (when SVG fails to load)
    document.querySelectorAll('.rigr-graphic-uml img').forEach(function(img) {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', function() {
            window.open(img.src, '_blank');
        });
    });
});
