from collections import deque
from pathlib import Path
import math
import random

from PIL import Image, ImageDraw, ImageFilter


SOURCE = Path('/Users/renogy/Downloads/剖面图')
LOCAL_SOURCE = Path(__file__).resolve().parent / 'source-assets'
OUTPUT = Path(__file__).resolve().parents[1] / 'public' / 'assets' / 'rv-designer'
GENERATED = Path('/Users/renogy/.codex/generated_images/01a0a398-b26b-7213-ad80-8c0aed0d1322')


def remove_connected_white_background(image: Image.Image) -> Image.Image:
    rgba = image.convert('RGBA')
    pixels = rgba.load()
    width, height = rgba.size
    candidate = bytearray(width * height)

    for y in range(height):
        for x in range(width):
            r, g, b, _ = pixels[x, y]
            distance = math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2)
            if distance < 82:
                candidate[y * width + x] = 1

    queue: deque[tuple[int, int]] = deque()
    connected = bytearray(width * height)

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if candidate[index] and not connected[index]:
            connected[index] = 1
            queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        if x:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)

    for y in range(height):
        for x in range(width):
            if not connected[y * width + x]:
                continue
            r, g, b, _ = pixels[x, y]
            distance = math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2)
            alpha = max(0, min(255, round((distance - 3) / 55 * 255)))
            pixels[x, y] = (r, g, b, alpha)

    return rgba


def prepare_device(source_name: str, output_name: str, remove_watermark: bool = False) -> None:
    image = Image.open(SOURCE / '用电器单独' / source_name).convert('RGBA')
    if remove_watermark:
        # The product ends above this row; the remaining pixels are the generator watermark.
        ImageDraw.Draw(image).rectangle((0, 738, image.width, image.height), fill=(255, 255, 255, 255))
    output = remove_connected_white_background(image)
    output.save(OUTPUT / output_name, optimize=True)


def prepare_local_device(source_name: str, output_name: str) -> None:
    image = Image.open(LOCAL_SOURCE / source_name).convert('RGBA')
    remove_connected_white_background(image).save(OUTPUT / output_name, optimize=True)


def create_airflow() -> None:
    width, height = 900, 1200
    random.seed(24)
    base = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    glow = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    detail = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    detail_draw = ImageDraw.Draw(detail)

    starts = (225, 375, 525, 675)
    for index, start_x in enumerate(starts):
        points = []
        phase = index * 0.85
        for step in range(61):
            t = step / 60
            spread = (start_x - width / 2) * (0.62 * t)
            wave = math.sin(t * math.pi * 2.1 + phase) * (13 + 24 * t)
            drift = math.sin(t * math.pi * 0.72 + phase) * 24 * t
            x = start_x + spread + wave + drift
            y = -18 + t * (height + 36)
            points.append((x, y))

        glow_draw.line(points, fill=(104, 218, 239, 112), width=52, joint='curve')
        glow_draw.line(points, fill=(207, 247, 252, 138), width=25, joint='curve')
        detail_draw.line(points, fill=(225, 252, 255, 182), width=7, joint='curve')

        for _ in range(30):
            t = random.uniform(0.06, 0.98)
            point = points[min(60, round(t * 60))]
            radius_x = random.uniform(14, 38) * (0.7 + t)
            radius_y = random.uniform(30, 76) * (0.7 + t)
            offset_x = random.uniform(-25, 25) * t
            glow_draw.ellipse(
                (
                    point[0] + offset_x - radius_x,
                    point[1] - radius_y,
                    point[0] + offset_x + radius_x,
                    point[1] + radius_y,
                ),
                fill=(154, 231, 245, random.randint(20, 46)),
            )

    glow = glow.filter(ImageFilter.GaussianBlur(22))
    detail = detail.filter(ImageFilter.GaussianBlur(6))
    base.alpha_composite(glow)
    base.alpha_composite(detail)
    base.save(OUTPUT / 'airflow.png', optimize=True)


def create_closed_shade_overlay(source_name: str, output_name: str) -> None:
    """Project the generated pleated-shade texture into the original four window openings."""
    generated = Image.open(LOCAL_SOURCE / source_name).convert('RGBA')
    # The generated dining shade has the cleanest broad run of real pleated fabric.
    texture = generated.crop((953, 360, 1185, 438))
    overlay = Image.new('RGBA', (2400, 1200), (0, 0, 0, 0))

    windows = (
        # Far-left angled bedside window.
        ((145, 455, 221, 594), ((3, 13), (62, 2), (75, 125), (10, 138)), 0),
        # Window above the bed.
        ((328, 468, 457, 541), None, 6),
        # Kitchen window.
        ((1041, 493, 1172, 579), None, 7),
        # Dining/lounge window.
        ((1287, 492, 1593, 592), None, 8),
    )

    for box, polygon, radius in windows:
        width = box[2] - box[0]
        height = box[3] - box[1]
        shade = texture.resize((width, height), Image.Resampling.LANCZOS)
        mask = Image.new('L', (width, height), 0)
        mask_draw = ImageDraw.Draw(mask)
        if polygon:
            mask_draw.polygon(polygon, fill=255)
        else:
            mask_draw.rounded_rectangle((0, 0, width - 1, height - 1), radius=radius, fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(0.65))
        shade.putalpha(mask)
        overlay.alpha_composite(shade, (box[0], box[1]))

    overlay.save(OUTPUT / output_name, optimize=True)


def crop_aligned_pair(first_name: str, second_name: str, padding: int = 8) -> None:
    first = Image.open(OUTPUT / first_name).convert('RGBA')
    second = Image.open(OUTPUT / second_name).convert('RGBA')
    boxes = [first.getchannel('A').getbbox(), second.getchannel('A').getbbox()]
    valid_boxes = [box for box in boxes if box]
    left = max(0, min(box[0] for box in valid_boxes) - padding)
    top = max(0, min(box[1] for box in valid_boxes) - padding)
    right = min(first.width, max(box[2] for box in valid_boxes) + padding)
    bottom = min(first.height, max(box[3] for box in valid_boxes) + padding)
    crop_box = (left, top, right, bottom)
    first.crop(crop_box).save(OUTPUT / first_name, optimize=True)
    second.crop(crop_box).save(OUTPUT / second_name, optimize=True)


def crop_single(name: str, padding: int = 8) -> None:
    image = Image.open(OUTPUT / name).convert('RGBA')
    box = image.getchannel('A').getbbox()
    if not box:
        return
    crop_box = (
        max(0, box[0] - padding),
        max(0, box[1] - padding),
        min(image.width, box[2] + padding),
        min(image.height, box[3] + padding),
    )
    image.crop(crop_box).save(OUTPUT / name, optimize=True)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)

    Image.open(SOURCE / '房车内部剖面图-关灯-没有用电器.jpg').save(
        OUTPUT / 'cabin-light-off.jpg', quality=94, optimize=True
    )
    Image.open(SOURCE / '房车内部剖面图-开灯-没有用电器.jpg').save(
        OUTPUT / 'cabin-light-on.jpg', quality=94, optimize=True
    )

    devices = (
        ('空调关闭.png', 'climate-off.png', False),
        ('空调打开.png', 'climate-on.png', False),
        ('加湿器关闭.png', 'humidifier-off.png', False),
        ('加湿器打开.png', 'humidifier-on.png', False),
        ('咖啡机关闭.png', 'coffee-off.png', True),
        ('咖啡机打开.png', 'coffee-on.png', True),
        ('电视关闭.png', 'tv-off.png', False),
        ('电视打开.png', 'tv-on.png', False),
        ('音响关闭.png', 'audio-off.png', False),
        ('音响打开.png', 'audio-on.png', False),
        ('电脑.png', 'computer.png', False),
    )
    for source_name, output_name, remove_watermark in devices:
        prepare_device(source_name, output_name, remove_watermark)

    prepare_local_device('camera-off.png', 'camera-off.png')
    prepare_local_device('camera-on.png', 'camera-on.png')

    for first_name, second_name in (
        ('climate-off.png', 'climate-on.png'),
        ('humidifier-off.png', 'humidifier-on.png'),
        ('coffee-off.png', 'coffee-on.png'),
        ('tv-off.png', 'tv-on.png'),
        ('audio-off.png', 'audio-on.png'),
        ('camera-off.png', 'camera-on.png'),
    ):
        crop_aligned_pair(first_name, second_name)
    crop_single('computer.png')

    mist = Image.open(GENERATED / 'exec-34a7b3e1-8447-4198-b022-5029c7565461.png').convert('RGBA')
    mist.save(OUTPUT / 'humidifier-mist.png', optimize=True)
    create_airflow()
    create_closed_shade_overlay('shades-closed-on-generated.png', 'shades-closed-on.png')
    create_closed_shade_overlay('shades-closed-off-generated.png', 'shades-closed-off.png')


if __name__ == '__main__':
    main()
