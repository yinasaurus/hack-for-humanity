"""Optimize a supplied static companion GLB for mobile use.

The source stays untouched. Textures are capped at 1024 px, helper objects are
removed, and very dense meshes are decimated while preserving materials/UVs.

Run with Blender in background mode:
  blender --background --python prepare_static_companion_glb.py -- \
    input.glb output.glb character_id target_polygons attribution
"""

from __future__ import annotations

import sys
from pathlib import Path

import bpy


def arguments() -> tuple[Path, Path, str, int, str]:
    if "--" not in sys.argv:
        raise SystemExit("Expected arguments after --")
    values = sys.argv[sys.argv.index("--") + 1 :]
    if len(values) != 5:
        raise SystemExit(
            "Usage: -- input.glb output.glb character_id target_polygons attribution"
        )
    source = Path(values[0]).expanduser().resolve()
    output = Path(values[1]).expanduser().resolve()
    if not source.is_file():
        raise SystemExit(f"Input GLB not found: {source}")
    output.parent.mkdir(parents=True, exist_ok=True)
    return source, output, values[2], int(values[3]), values[4]


source, output, character_id, target_polygons, attribution = arguments()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))

textured_meshes = [
    obj
    for obj in bpy.data.objects
    if obj.type == "MESH" and any(slot.material for slot in obj.material_slots)
]
if not textured_meshes:
    raise SystemExit("No textured mesh found")

# Delete untextured lighting/preview helpers that were bundled by Sketchfab.
for obj in list(bpy.data.objects):
    if obj.type == "MESH" and obj not in textured_meshes:
        bpy.data.objects.remove(obj, do_unlink=True)

total_polygons = sum(len(obj.data.polygons) for obj in textured_meshes)
if total_polygons > target_polygons:
    ratio = max(0.05, min(1.0, target_polygons / total_polygons))
    for obj in textured_meshes:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        modifier = obj.modifiers.new("MobileDecimate", "DECIMATE")
        modifier.ratio = ratio
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.select_set(False)

for index, obj in enumerate(textured_meshes):
    suffix = "" if len(textured_meshes) == 1 else f"_{index + 1}"
    obj.name = f"{character_id.title()}Mesh{suffix}"
    obj.data.name = obj.name
    obj["source_attribution"] = attribution

# The supplied sources contain 4K textures that dominate app size. 1024 px is
# ample for the on-phone companion framing and keeps the exact source artwork.
for image in bpy.data.images:
    width, height = image.size
    if max(width, height) <= 1024:
        continue
    scale = 1024 / max(width, height)
    image.scale(max(1, round(width * scale)), max(1, round(height * scale)))
    image.pack()

bpy.ops.export_scene.gltf(
    filepath=str(output),
    export_format="GLB",
    export_copyright=attribution,
    export_animations=False,
    export_skins=False,
    export_morph=False,
    export_lights=False,
    export_cameras=False,
    export_extras=True,
    export_yup=True,
)

final_polygons = sum(len(obj.data.polygons) for obj in textured_meshes)
print(
    f"Exported {character_id}: {final_polygons} polygons, "
    f"{output.stat().st_size} bytes -> {output}"
)
