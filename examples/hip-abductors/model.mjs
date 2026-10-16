export const HIP = {
  abductorArm: 5,
  weightArm: 10.5,
  comHeight: 26,
  share: 5 / 6,
  pull: 20,
  leanMax: 10,
};

export function stance(lean, hip = HIP) {
  const rad = (lean * Math.PI) / 180;
  const weightArm = hip.weightArm - hip.comHeight * Math.sin(rad);
  const abductor = (hip.share * weightArm) / hip.abductorArm;
  const pull = (hip.pull * Math.PI) / 180;
  const vertical = hip.share + abductor * Math.cos(pull);
  const lateral = abductor * Math.sin(pull);
  const joint = Math.hypot(vertical, lateral);
  const tilt = (Math.atan2(lateral, vertical) * 180) / Math.PI;
  return { lean, weightArm, abductor, joint, tilt };
}
