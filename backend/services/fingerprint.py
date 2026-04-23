import imagehash
from PIL import Image
import io

def compute_phash(image_bytes):
    image = Image.open(io.BytesIO(image_bytes))
    hash_value = imagehash.phash(image)
    return str(hash_value)

def compare_hashes(hash1, hash2):
    h1 = imagehash.hex_to_hash(hash1)
    h2 = imagehash.hex_to_hash(hash2)
    hamming_distance = h1 - h2
    similarity = 1 - (hamming_distance / 64)
    return similarity