#!/usr/bin/env python3
"""Check UF2 structure/target and report hash; this does not test hardware."""
import hashlib
import json
import pathlib
import struct
import sys

path = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).with_name("EE3600_Practical_2_Pico.uf2")
data = path.read_bytes()
assert data and len(data) % 512 == 0, "UF2 must contain complete 512-byte blocks"
blocks = len(data) // 512
addresses = []
payloads = []
for index in range(blocks):
    block = data[index * 512:(index + 1) * 512]
    magic0, magic1, flags, address, size, sequence, count, family = struct.unpack_from("<8I", block)
    assert (magic0, magic1) == (0x0A324655, 0x9E5D5157), "UF2 magic mismatch"
    assert struct.unpack_from("<I", block, 508)[0] == 0x0AB16F30, "UF2 end magic mismatch"
    assert flags & 0x2000 and not flags & 0x1, "Expected a family-tagged flash block"
    assert family == 0xE48BFF56, "Wrong family: expected original RP2040 Pico"
    assert sequence == index and count == blocks, "Block sequence/count mismatch"
    assert size == 256, "Unexpected payload size"
    assert 0x10000000 <= address < 0x10200000, "Outside original Pico's 2 MB flash"
    addresses.append(address)
    payloads.append(block[32:32 + size])
assert addresses == list(range(0x10000000, 0x10000000 + 256 * blocks, 256)), "Missing/overlapping flash blocks"
payload = b"".join(payloads)
assert b"INFO,EE3600_P2,1.0.0" in payload, "Firmware identity missing"
assert b"ENC=GP26/GP27,MOTOR=GP3/GP2" in payload, "Expected wiring identity missing"
report = {
    "file": path.name, "bytes": len(data), "blocks": blocks,
    "payload_bytes": len(payload), "family": "RP2040", "family_id": "0xe48bff56",
    "flash_start": hex(addresses[0]), "flash_end_exclusive": hex(addresses[-1] + 256),
    "sha256": hashlib.sha256(data).hexdigest(),
    "result": "UF2 structure and embedded identity verified; hardware not tested"
}
print(json.dumps(report, indent=2))
