"""Print a compact JSON inventory for an animated horse GLB.

Run with Blender in background mode:
  blender --background --python inspect_horse_glb.py -- input.glb
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import bpy


def cli_input() -> Path:
    if "--" not in sys.argv:
        raise SystemExit("Expected a GLB path after --")
    value = Path(sys.argv[sys.argv.index("--") + 1]).expanduser().resolve()
    if not value.is_file():
        raise SystemExit(f"GLB not found: {value}")
    return value


def rounded(values):
    return [round(float(value), 5) for value in values]


source = cli_input()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))

inventory = {
    "source": str(source),
    "blender": bpy.app.version_string,
    "objects": [],
    "armatures": [],
    "meshes": [],
    "materials": [],
    "actions": [],
}

for obj in sorted(bpy.data.objects, key=lambda item: item.name.lower()):
    inventory["objects"].append(
        {
            "name": obj.name,
            "type": obj.type,
            "parent": obj.parent.name if obj.parent else None,
            "location": rounded(obj.location),
            "scale": rounded(obj.scale),
        }
    )
    if obj.type == "ARMATURE":
        inventory["armatures"].append(
            {
                "name": obj.name,
                "bones": [
                    {
                        "name": bone.name,
                        "parent": bone.parent.name if bone.parent else None,
                        "head": rounded(bone.head_local),
                        "tail": rounded(bone.tail_local),
                    }
                    for bone in obj.data.bones
                ],
            }
        )
    elif obj.type == "MESH":
        inventory["meshes"].append(
            {
                "name": obj.name,
                "vertices": len(obj.data.vertices),
                "polygons": len(obj.data.polygons),
                "materials": [slot.material.name if slot.material else None for slot in obj.material_slots],
                "shape_keys": list(obj.data.shape_keys.key_blocks.keys()) if obj.data.shape_keys else [],
                "armature_modifiers": [
                    modifier.object.name
                    for modifier in obj.modifiers
                    if modifier.type == "ARMATURE" and modifier.object
                ],
            }
        )

for material in sorted(bpy.data.materials, key=lambda item: item.name.lower()):
    inventory["materials"].append(
        {
            "name": material.name,
            "base_color": rounded(material.diffuse_color),
            "roughness": round(float(material.roughness), 5),
            "metallic": round(float(material.metallic), 5),
            "blend_method": getattr(material, "surface_render_method", None),
        }
    )

for action in sorted(bpy.data.actions, key=lambda item: item.name.lower()):
    slots = []
    if hasattr(action, "slots"):
        slots = [slot.name_display for slot in action.slots]
    curves = []
    for layer in action.layers:
        for strip in layer.strips:
            for channelbag in strip.channelbags:
                for curve in channelbag.fcurves:
                    curves.append(curve)
    animated_bones = sorted(
        {
            match.group(1)
            for curve in curves
            if (match := re.search(r'pose\.bones\["([^"]+)"\]', curve.data_path))
        }
    )
    inventory["actions"].append(
        {
            "name": action.name,
            "frame_range": rounded(action.frame_range),
            "slots": slots,
            "fcurve_count": len(curves),
            "keyframe_count": sum(len(curve.keyframe_points) for curve in curves),
            "animated_bones": animated_bones,
        }
    )

inventory["animation_data"] = []
for obj in bpy.data.objects:
    animation_data = obj.animation_data
    if not animation_data:
        continue
    inventory["animation_data"].append(
        {
            "object": obj.name,
            "action": animation_data.action.name if animation_data.action else None,
            "slot": animation_data.action_slot.name_display if animation_data.action_slot else None,
            "nla_tracks": [
                {
                    "name": track.name,
                    "strips": [
                        {
                            "name": strip.name,
                            "action": strip.action.name if strip.action else None,
                            "frame_start": round(float(strip.frame_start), 4),
                            "frame_end": round(float(strip.frame_end), 4),
                        }
                        for strip in track.strips
                    ],
                }
                for track in animation_data.nla_tracks
            ],
        }
    )

print("HORSE_INVENTORY=" + json.dumps(inventory, separators=(",", ":")))
