"""Generate extension icons as PNG files."""
from PIL import Image, ImageDraw

for size in [16, 48, 128]:
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Dark green shield background
    margin = max(1, size // 10)
    # Draw a rounded rectangle as shield body
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=size // 5,
        fill=(26, 92, 26, 255),
        outline=(74, 222, 128, 200),
        width=max(1, size // 16),
    )

    # Draw "S" letter
    cx, cy = size // 2, size // 2
    r = size // 4
    # Simple S using arcs
    draw.text(
        (cx - r // 2, cy - r),
        "S",
        fill=(74, 222, 128, 255),
    )

    img.save(f'C:/Users/Pc/sportshield/extension/icons/icon{size}.png')
    print(f'icon{size}.png generated')
