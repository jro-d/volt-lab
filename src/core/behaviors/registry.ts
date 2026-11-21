import type { DeviceType } from '../../types/electrical';
import type { DeviceBehavior } from './types';
import { meter3pBehavior } from './meter3p';
import { timerModesBehavior } from './timerModes';
import { fuse1pBehavior, fuse3pBehavior } from './fuse';
import { rcboBehavior } from './rcbo';
import { generatorBehavior } from './generator';
import { atsTransferBehavior } from './atsTransfer';
import { floatSwitchBehavior, pressureSwitchBehavior } from './processSwitches';
import { phaseMonitorBehavior } from './phaseMonitor';
import * as prot from './protectionDevices';
import { motor1pBehavior, capacitorBehavior } from './singlePhaseMotor';
import { psuBehavior, dcSensorBehavior, plc24Behavior } from './dcDevices';
import * as pwr from './powerSystems';
import { plcProgramBehavior } from './plcProgram';
import * as ctl from './controlModules';
import * as fld from './fieldDevices';
import * as drv from './drives';
import * as home from './homeLoads';
import * as auto from './automation';

const BEHAVIORS: DeviceBehavior[] = [meter3pBehavior, timerModesBehavior, fuse1pBehavior, fuse3pBehavior, rcboBehavior, generatorBehavior, atsTransferBehavior, floatSwitchBehavior, pressureSwitchBehavior, phaseMonitorBehavior, psuBehavior, dcSensorBehavior, plc24Behavior, motor1pBehavior, capacitorBehavior,
  prot.rcd4pBehavior, prot.gfciBehavior, prot.afddBehavior, prot.mccbBehavior, prot.mpcbBehavior, prot.isolatorBehavior,
  prot.voltageRelayBehavior, prot.earthLeakageRelayBehavior, prot.ptcRelayBehavior, prot.coreBalanceCtBehavior,
  prot.currentTransformerBehavior, prot.terminalBlockBehavior, prot.distributionBlockBehavior, prot.motorThermalBehavior, prot.panelAmmeterBehavior,
  pwr.manualTransferBehavior, pwr.upsBehavior, pwr.pvStringBehavior, pwr.dcIsolatorBehavior, pwr.inverterBehavior, pwr.netMeterBehavior,
  pwr.distributionTransformerBehavior, pwr.capacitorBankBehavior, pwr.pfControllerBehavior, pwr.shoreBoxBehavior,
  pwr.groundDetectionBehavior, pwr.synchroscopeBehavior, pwr.reversePowerBehavior, pwr.preferentialTripBehavior,
  plcProgramBehavior,
  ctl.starDeltaTimerBehavior, ctl.counterRelayBehavior, ctl.impulseRelayBehavior, ctl.staircaseTimerBehavior, ctl.timeSwitchBehavior,
  ctl.alternatingRelayBehavior, ctl.ssrBehavior, ctl.operatorBehavior, ctl.auxBlockBehavior, ctl.interlockBehavior,
  ctl.safetyRelayBehavior, ctl.twoHandBehavior, ctl.doorInterlockBehavior, ctl.pullCordBehavior,
  fld.electrodeLevelBehavior, fld.thermostatBehavior, fld.thermocoupleBehavior, fld.tempControllerBehavior, fld.reedSwitchBehavior,
  fld.photocellBehavior, fld.pirBehavior, fld.flowSwitchBehavior, fld.zeroSpeedBehavior, fld.solenoidValveBehavior,
  fld.smokeDetectorBehavior, fld.callPointBehavior, fld.fireAlarmPanelBehavior,
  drv.softStarterBehavior, drv.reducedVoltageBehavior, drv.dahlanderBehavior, drv.rotorBankBehavior, drv.woundRotorBehavior,
  drv.dcShuntBehavior, drv.brakeMotorBehavior, drv.dcInjectionBehavior, drv.vfdLinkBehavior, drv.lineReactorBehavior,
  drv.submersiblePumpBehavior, drv.compressorBehavior, drv.hoistConveyorBehavior,
  home.applianceBehavior, home.emergencyLightBehavior, home.fanRegulatorBehavior, home.fanSpeedBehavior, home.doorbellBehavior, home.powerStripBehavior,
  auto.valve52Behavior, auto.cylinderBehavior, auto.reedSwitchLinkedBehavior, auto.analogModuleBehavior, auto.hmiBehavior];

const byType = new Map<DeviceType, DeviceBehavior>();
for (const b of BEHAVIORS) for (const t of b.types) byType.set(t, b);

export function behaviorFor(type: DeviceType): DeviceBehavior | undefined {
  return byType.get(type);
}
