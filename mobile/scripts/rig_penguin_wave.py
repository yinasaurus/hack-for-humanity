"""Add two weighted flipper joints and a friendly Wave clip to the app Penguin.

The Quaternius source animates only Body/Head. Its visible flippers are part of
the body mesh, so this script adds deform bones with smooth side-region weights.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy
from mathutils import Euler


def paths() -> tuple[Path, Path]:
    if "--" not in sys.argv:
        raise SystemExit("Expected input and output after --")
    values = sys.argv[sys.argv.index("--") + 1 :]
    if len(values) != 2:
        raise SystemExit("Usage: -- input.gltf output.glb")
    source = Path(values[0]).expanduser().resolve()
    output = Path(values[1]).expanduser().resolve()
    if not source.is_file():
        raise SystemExit(f"Input not found: {source}")
    output.parent.mkdir(parents=True, exist_ok=True)
    return source, output


def action_curves(action: bpy.types.Action):
    for layer in action.layers:
        for strip in layer.strips:
            for channelbag in strip.channelbags:
                yield from channelbag.fcurves


source, output = paths()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))

armature = next(obj for obj in bpy.data.objects if obj.type == "ARMATURE")
mesh = next(
    obj
    for obj in bpy.data.objects
    if obj.type == "MESH" and any(slot.material for slot in obj.material_slots)
)
armature.name = "PenguinRig"
armature.data.name = "PenguinRig"
mesh.name = "PenguinMesh"
mesh.data.name = "PenguinMesh"

for obj in list(bpy.data.objects):
    if obj.type == "MESH" and obj is not mesh:
        bpy.data.objects.remove(obj, do_unlink=True)

# Add anatomically placed flipper bones in the imported mesh coordinate frame.
bpy.context.view_layer.objects.active = armature
armature.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
body = armature.data.edit_bones.get("Body")
for name, sign in (("Flipper_L", 1.0), ("Flipper_R", -1.0)):
    old = armature.data.edit_bones.get(name)
    if old:
        armature.data.edit_bones.remove(old)
    bone = armature.data.edit_bones.new(name)
    bone.head = (0.50 * sign, 0.0, 0.72)
    bone.tail = (1.12 * sign, 0.03, 0.40)
    bone.parent = body
    bone.use_deform = True
bpy.ops.object.mode_set(mode="OBJECT")
armature.select_set(False)

# Smoothly transfer the lateral flipper vertices from their original groups.
# The body ends near |x|=.69; flipper tips reach |x|=1.135.
for name, sign in (("Flipper_L", 1.0), ("Flipper_R", -1.0)):
    group = mesh.vertex_groups.get(name) or mesh.vertex_groups.new(name=name)
    for vertex in mesh.data.vertices:
        lateral = vertex.co.x * sign
        if lateral <= 0.52 or vertex.co.z >= 0.94:
            continue
        weight = max(0.0, min(1.0, (lateral - 0.52) / 0.24))
        for assignment in list(vertex.groups):
            original = mesh.vertex_groups[assignment.group]
            if original.name == name:
                continue
            original.add([vertex.index], assignment.weight * (1.0 - weight), "REPLACE")
        group.add([vertex.index], weight, "REPLACE")

armature.animation_data_create()
old_wave = bpy.data.actions.get("Wave")
if old_wave:
    bpy.data.actions.remove(old_wave)
wave = bpy.data.actions.new("Wave")
wave.use_frame_range = True
wave.frame_range = (0.0, 48.0)
wave.use_cyclic = False
armature.animation_data.action = wave

for frame, left_z, right_z, body_y, head_x in (
    (0, 0.0, 0.0, 0.0, 0.0),
    (8, -18.0, 18.0, -2.0, -3.0),
    (16, 55.0, -55.0, 2.5, 3.0),
    (24, -25.0, 25.0, -2.5, -2.0),
    (32, 55.0, -55.0, 2.0, 2.5),
    (40, -12.0, 12.0, -1.0, -1.5),
    (48, 0.0, 0.0, 0.0, 0.0),
):
    for name, degrees in (("Flipper_L", left_z), ("Flipper_R", right_z)):
        bone = armature.pose.bones[name]
        bone.rotation_mode = "XYZ"
        # The bones point laterally; local Y swings each flipper visibly up
        # and down while keeping its shoulder attached to the body.
        bone.rotation_euler = Euler((0.0, math.radians(degrees), 0.0), "XYZ")
        bone.keyframe_insert("rotation_euler", frame=frame, group=name)
    body_bone = armature.pose.bones["Body"]
    body_bone.rotation_mode = "XYZ"
    body_bone.rotation_euler.y = math.radians(body_y)
    body_bone.keyframe_insert("rotation_euler", frame=frame, group="Body")
    head_bone = armature.pose.bones["Head"]
    head_bone.rotation_mode = "XYZ"
    head_bone.rotation_euler.x = math.radians(head_x)
    head_bone.keyframe_insert("rotation_euler", frame=frame, group="Head")

for curve in action_curves(wave):
    for point in curve.keyframe_points:
        point.interpolation = "BEZIER"
        point.handle_left_type = "AUTO_CLAMPED"
        point.handle_right_type = "AUTO_CLAMPED"

# Ensure every action remains discoverable by the glTF action exporter.
for track in list(armature.animation_data.nla_tracks):
    armature.animation_data.nla_tracks.remove(track)
for action in bpy.data.actions:
    track = armature.animation_data.nla_tracks.new()
    track.name = action.name
    strip = track.strips.new(action.name, 1, action)
    strip.action_frame_start = action.frame_range[0]
    strip.action_frame_end = action.frame_range[1]
armature.animation_data.action = bpy.data.actions.get("Idle") or wave
armature["source_attribution"] = "Cute Animated Monsters by Quaternius, CC0"

bpy.context.scene.render.fps = 30
bpy.ops.export_scene.gltf(
    filepath=str(output),
    export_format="GLB",
    export_copyright="Cute Animated Monsters by Quaternius, CC0; flipper rig and Wave animation added for Buddi.",
    export_animations=True,
    export_animation_mode="ACTIONS",
    export_merge_animation="ACTION",
    export_anim_single_armature=True,
    export_force_sampling=True,
    export_frame_step=1,
    export_optimize_animation_size=True,
    export_optimize_animation_keep_anim_armature=True,
    export_skins=True,
    export_morph=True,
    export_lights=False,
    export_cameras=False,
    export_extras=True,
    export_yup=True,
)

print(
    "Exported Penguin clips: "
    + ", ".join(sorted(action.name for action in bpy.data.actions))
    + f" ({output.stat().st_size} bytes)"
)
