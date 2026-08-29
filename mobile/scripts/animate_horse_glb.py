"""Add polished companion animation clips to Jungle Jim's cartoon horse.

The input GLB remains untouched. The output keeps the original skinned mesh,
texture, rig, and run cycle, while adding compact looping actions used by Buddi.

Run with Blender in background mode:
  blender --background --python animate_horse_glb.py -- input.glb output.glb
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy
from mathutils import Euler, Matrix, Quaternion, Vector


def cli_paths() -> tuple[Path, Path]:
    if "--" not in sys.argv:
        raise SystemExit("Expected input and output GLB paths after --")
    values = sys.argv[sys.argv.index("--") + 1 :]
    if len(values) != 2:
        raise SystemExit("Usage: -- input.glb output.glb")
    source = Path(values[0]).expanduser().resolve()
    output = Path(values[1]).expanduser().resolve()
    if not source.is_file():
        raise SystemExit(f"Input GLB not found: {source}")
    output.parent.mkdir(parents=True, exist_ok=True)
    return source, output


def quaternion_degrees(x: float = 0.0, y: float = 0.0, z: float = 0.0) -> Quaternion:
    return Euler(tuple(math.radians(value) for value in (x, y, z)), "XYZ").to_quaternion()


def clear_pose(armature: bpy.types.Object) -> None:
    for bone in armature.pose.bones:
        bone.matrix_basis = Matrix.Identity(4)
        bone.rotation_mode = "QUATERNION"


def remove_action(name: str) -> None:
    action = bpy.data.actions.get(name)
    if action:
        bpy.data.actions.remove(action)


def begin_action(armature: bpy.types.Object, name: str, end_frame: int) -> bpy.types.Action:
    remove_action(name)
    action = bpy.data.actions.new(name)
    armature.animation_data.action = action
    clear_pose(armature)
    action.use_frame_range = True
    action.frame_range = (0.0, float(end_frame))
    action.use_cyclic = True
    return action


def key_pose(
    armature: bpy.types.Object,
    bone_name: str,
    frame: int,
    rotation: Quaternion | None = None,
    location: Vector | tuple[float, float, float] | None = None,
) -> None:
    bone = armature.pose.bones[bone_name]
    bone.rotation_mode = "QUATERNION"
    bone.rotation_quaternion = rotation.copy() if rotation else Quaternion((1.0, 0.0, 0.0, 0.0))
    bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone_name)
    if location is not None:
        bone.location = Vector(location)
        bone.keyframe_insert("location", frame=frame, group=bone_name)


def key_euler(
    armature: bpy.types.Object,
    bone_name: str,
    frame: int,
    degrees: tuple[float, float, float],
) -> None:
    key_pose(armature, bone_name, frame, quaternion_degrees(*degrees))


def smooth_action(action: bpy.types.Action) -> None:
    for layer in action.layers:
        for strip in layer.strips:
            for channelbag in strip.channelbags:
                for curve in channelbag.fcurves:
                    for point in curve.keyframe_points:
                        point.interpolation = "BEZIER"
                        point.handle_left_type = "AUTO_CLAMPED"
                        point.handle_right_type = "AUTO_CLAMPED"


def capture_pose(armature: bpy.types.Object, names: list[str], frame: int) -> dict[str, tuple[Vector, Quaternion]]:
    bpy.context.scene.frame_set(frame)
    return {
        name: (armature.pose.bones[name].location.copy(), armature.pose.bones[name].rotation_quaternion.copy())
        for name in names
    }


source, output = cli_paths()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))

scene = bpy.context.scene
scene.render.fps = 30
scene.frame_start = 0
scene.frame_end = 90

armatures = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
if len(armatures) != 1:
    raise SystemExit(f"Expected one armature, found {len(armatures)}")
armature = armatures[0]
armature.name = "HorseRig"
armature.data.name = "HorseRig"
armature.animation_data_create()

meshes = [obj for obj in bpy.data.objects if obj.type == "MESH" and any(obj.material_slots)]
if len(meshes) != 1:
    raise SystemExit(f"Expected one textured horse mesh, found {len(meshes)}")
horse_mesh = meshes[0]
horse_mesh.name = "HorseMesh"
horse_mesh.data.name = "HorseMesh"

# Remove the Sketchfab lighting proxy and untextured helper sphere. They add no
# value in-app and otherwise become stray nodes in the exported character.
for obj in list(bpy.data.objects):
    if obj.type == "MESH" and obj is not horse_mesh:
        bpy.data.objects.remove(obj, do_unlink=True)
for helper_name in ("Light", "Object_51", "Object_52"):
    helper = bpy.data.objects.get(helper_name)
    if helper:
        bpy.data.objects.remove(helper, do_unlink=True)

# Preserve the supplied full-body motion as the energetic Run clip.
source_actions = sorted(bpy.data.actions, key=lambda action: action.frame_range[1] - action.frame_range[0], reverse=True)
run = source_actions[0]
run.name = "Run"
run.use_frame_range = True
run.frame_range = (0.0, 24.0)
run.use_cyclic = True
armature.animation_data.action = run
for track in list(armature.animation_data.nla_tracks):
    armature.animation_data.nla_tracks.remove(track)

# Capture one believable bent foreleg from the authored run cycle. Wave uses
# only this limb, blended toward the rest pose, so the horse stays grounded.
wave_chain = [
    "leg_front_left_top0_03",
    "leg_front_left_top1_04",
    "leg_front_left_top2_05",
    "leg_front_left_bot0_06",
    "leg_front_left_hoof_07",
]
wave_pose = capture_pose(armature, wave_chain, 0)
play_right_chain = [
    "leg_front_right_top0_09",
    "leg_front_right_top1_010",
    "leg_front_right_top2_011",
    "leg_front_right_bot0_012",
    "leg_front_right_hoof_014",
]
play_right_pose = capture_pose(armature, play_right_chain, 12)

# Remove the zero-length imported setup action, retaining only useful motion.
for action in list(bpy.data.actions):
    if action is not run and action.frame_range[1] <= action.frame_range[0]:
        bpy.data.actions.remove(action)

# Idle: slow breathing, attentive head movement, and a relaxed tail swish.
idle = begin_action(armature, "Idle", 90)
idle_frames = (0, 22, 45, 68, 90)
for frame, body, neck, head_x, head_z, tail in zip(
    idle_frames,
    (0.0, 0.8, 0.0, -0.65, 0.0),
    (-0.6, 0.8, -0.25, -0.9, -0.6),
    (0.4, -1.1, 0.35, 0.85, 0.4),
    (0.0, 1.3, 0.0, -1.0, 0.0),
    (0.0, 3.8, 0.0, -3.2, 0.0),
):
    key_euler(armature, "body_top0_034", frame, (body * 0.45, 0.0, 0.0))
    key_euler(armature, "body_top1_037", frame, (-body * 0.35, 0.0, 0.0))
    key_euler(armature, "neck0_038", frame, (neck, 0.0, 0.0))
    key_euler(armature, "neck1_039", frame, (-neck * 0.45, 0.0, 0.0))
    key_euler(armature, "head0_040", frame, (head_x, 0.0, head_z))
    for index, bone_name in enumerate(("tail0_017", "tail1_018", "tail2_019", "tail3_020", "tail4_021")):
        key_euler(armature, bone_name, frame, (0.15 * index, 0.0, tail * (0.45 + index * 0.18)))
smooth_action(idle)

# Talk: two friendly head bobs with overlapping neck follow-through.
talk = begin_action(armature, "Talk", 48)
for frame, nod, side in zip(
    (0, 6, 12, 18, 24, 30, 36, 42, 48),
    (0.0, 4.5, -2.3, 4.0, -2.0, 4.8, -2.4, 3.2, 0.0),
    (0.0, 0.7, 0.0, -0.65, 0.0, 0.75, 0.0, -0.55, 0.0),
):
    key_euler(armature, "neck0_038", frame, (nod * 0.38, 0.0, side * 0.35))
    key_euler(armature, "neck1_039", frame, (nod * 0.24, 0.0, side * 0.5))
    key_euler(armature, "head0_040", frame, (-nod, side * 0.4, side))
    key_euler(armature, "body_top1_037", frame, (nod * 0.07, 0.0, 0.0))
smooth_action(talk)

# Wave: plant three legs, raise the near foreleg, then make two small gestures.
wave = begin_action(armature, "Wave", 60)
for frame, amount, gesture in (
    (0, 0.0, 0.0),
    (10, 0.9, 0.0),
    (20, 1.0, 10.0),
    (30, 0.94, -8.0),
    (40, 1.0, 9.0),
    (50, 0.58, 0.0),
    (60, 0.0, 0.0),
):
    for bone_name in wave_chain:
        captured_location, captured_rotation = wave_pose[bone_name]
        rotation = Quaternion((1.0, 0.0, 0.0, 0.0)).slerp(captured_rotation, amount)
        if bone_name == "leg_front_left_top0_03":
            rotation = rotation @ quaternion_degrees(-amount * 18.0, 0.0, gesture)
        key_pose(armature, bone_name, frame, rotation, captured_location * amount)
    # A believable equine pawing gesture starts with a diagonal weight shift:
    # chest and pelvis lean over the planted foreleg while both hind legs brace.
    key_euler(armature, "body_top0_034", frame, (amount * 1.1, 0.0, -amount * 2.2))
    key_euler(armature, "body_top1_037", frame, (-amount * 0.7, 0.0, -amount * 1.5))
    key_euler(armature, "pelvis_016", frame, (-amount * 1.0, 0.0, amount * 1.6))
    key_euler(armature, "leg_front_right_top0_09", frame, (amount * 1.8, 0.0, amount * 1.4))
    key_euler(armature, "leg_front_right_top1_010", frame, (-amount * 1.0, 0.0, 0.0))
    key_euler(armature, "leg_hind_left_top0_024", frame, (-amount * 1.2, 0.0, amount * 0.8))
    key_euler(armature, "leg_hind_right_top0_030", frame, (amount * 1.0, 0.0, amount * 0.65))
    key_euler(armature, "neck0_038", frame, (-amount * 2.0, 0.0, -gesture * 0.08))
    key_euler(armature, "head0_040", frame, (amount * 1.7, 0.0, gesture * 0.12))
    key_euler(armature, "tail0_017", frame, (0.0, 0.0, gesture * 0.25))
    key_euler(armature, "tail1_018", frame, (0.0, 0.0, gesture * 0.42))
smooth_action(wave)

# Play: a grounded two-step prance. Unlike the source Run action this is
# authored around the bind pose, so there is no coordinate-conversion flip or
# large root translation. The whole torso, neck, tail, supporting hind legs,
# and alternating forelegs participate.
play = begin_action(armature, "Play", 72)
for frame, left_amount, right_amount, bounce, sway, head in (
    (0, 0.0, 0.0, 0.0, 0.0, 0.0),
    (10, 0.28, 0.0, 0.45, -1.0, 1.5),
    (20, 0.68, 0.0, 1.0, -2.2, 3.5),
    (30, 0.15, 0.1, 0.25, 0.5, -1.0),
    (42, 0.0, 0.68, 1.0, 2.2, 3.5),
    (54, 0.0, 0.2, 0.35, -0.5, -1.5),
    (64, 0.0, 0.0, 0.15, 0.7, 1.0),
    (72, 0.0, 0.0, 0.0, 0.0, 0.0),
):
    for bone_name in wave_chain:
        captured_location, captured_rotation = wave_pose[bone_name]
        rotation = Quaternion((1.0, 0.0, 0.0, 0.0)).slerp(captured_rotation, left_amount)
        key_pose(armature, bone_name, frame, rotation, captured_location * left_amount)
    for bone_name in play_right_chain:
        captured_location, captured_rotation = play_right_pose[bone_name]
        rotation = Quaternion((1.0, 0.0, 0.0, 0.0)).slerp(captured_rotation, right_amount)
        key_pose(armature, bone_name, frame, rotation, captured_location * right_amount)

    # Small root-space lift supplies body weight without changing orientation.
    key_pose(
        armature,
        "body_023",
        frame,
        quaternion_degrees(bounce * 0.7, 0.0, sway * 0.18),
        (0.0, 0.0, bounce * 1.6),
    )
    key_euler(armature, "body_top0_034", frame, (bounce * 1.6, 0.0, sway * 0.6))
    key_euler(armature, "body_top1_037", frame, (-bounce * 1.0, 0.0, sway * 0.45))
    key_euler(armature, "pelvis_016", frame, (-bounce * 1.2, 0.0, -sway * 0.5))
    key_euler(armature, "leg_hind_left_top0_024", frame, (-bounce * 2.0, 0.0, sway * 0.3))
    key_euler(armature, "leg_hind_left_top1_025", frame, (bounce * 1.15, 0.0, 0.0))
    key_euler(armature, "leg_hind_right_top0_030", frame, (bounce * 1.7, 0.0, sway * 0.25))
    key_euler(armature, "leg_hind_right_top1_031", frame, (-bounce * 1.0, 0.0, 0.0))
    key_euler(armature, "neck0_038", frame, (-head * 0.55, sway * 0.2, sway * 0.3))
    key_euler(armature, "neck1_039", frame, (-head * 0.35, sway * 0.18, sway * 0.35))
    key_euler(armature, "head0_040", frame, (head, -sway * 0.2, sway * 0.65))
    for index, bone_name in enumerate(("tail0_017", "tail1_018", "tail2_019", "tail3_020", "tail4_021")):
        key_euler(armature, bone_name, frame, (bounce * 0.35, 0.0, -sway * (0.6 + index * 0.22)))
smooth_action(play)

# Curious: an asymmetric head tilt with a small investigative lean.
curious = begin_action(armature, "Curious", 72)
for frame, tilt, lean in (
    (0, 0.0, 0.0),
    (14, 7.5, 2.0),
    (30, 10.0, 3.0),
    (46, 6.5, 1.5),
    (60, -2.0, -0.5),
    (72, 0.0, 0.0),
):
    key_euler(armature, "body_top1_037", frame, (lean * 0.3, 0.0, tilt * 0.08))
    key_euler(armature, "neck0_038", frame, (-lean, tilt * -0.2, tilt * 0.18))
    key_euler(armature, "neck1_039", frame, (lean * 0.4, tilt * -0.2, tilt * 0.22))
    key_euler(armature, "head0_040", frame, (lean * -1.2, tilt * 0.15, tilt))
smooth_action(curious)

# Gentle: a calm bow suitable for reassurance and celebration cooldowns.
gentle = begin_action(armature, "Gentle", 66)
for frame, bow, tail in (
    (0, 0.0, 0.0),
    (14, 3.0, 2.0),
    (28, 7.5, 4.0),
    (40, 7.5, -3.5),
    (54, 2.5, 2.0),
    (66, 0.0, 0.0),
):
    key_euler(armature, "body_top1_037", frame, (bow * 0.16, 0.0, 0.0))
    key_euler(armature, "neck0_038", frame, (bow * 0.65, 0.0, 0.0))
    key_euler(armature, "neck1_039", frame, (bow * 0.55, 0.0, 0.0))
    key_euler(armature, "head0_040", frame, (bow * 0.8, 0.0, 0.0))
    key_euler(armature, "tail0_017", frame, (0.0, 0.0, tail * 0.45))
    key_euler(armature, "tail1_018", frame, (0.0, 0.0, tail * 0.75))
    key_euler(armature, "tail2_019", frame, (0.0, 0.0, tail))
smooth_action(gentle)

# Keep Idle assigned so the neutral exported thumbnail and default app load are calm.
armature.animation_data.action = idle
scene.frame_set(0)
armature["animation_clips"] = ["Idle", "Talk", "Wave", "Play", "Curious", "Gentle", "Run"]
armature["source_attribution"] = "Cartoon Horse with animations by Jungle Jim, CC BY 4.0"

bpy.ops.export_scene.gltf(
    filepath=str(output),
    export_format="GLB",
    export_copyright="Cartoon Horse with animations by Jungle Jim (Sketchfab), CC BY 4.0; companion animations modified for Buddi.",
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

print("Exported horse with clips: " + ", ".join(sorted(action.name for action in bpy.data.actions)))
print(f"Output: {output} ({output.stat().st_size} bytes)")
