import { STAGE_FAMILIES, STAGE_GROUPS, type StageId } from '../types/stage';

export interface StageHeading {
  title: string;
  description?: string;
  /** Family title for the breadcrumb ("WalletConnect RPC"), never the key. */
  familyTitle?: string;
  /** Short family label for the tab title ("RPC"). */
  familyChip?: string;
  groupTitle?: string;
  /** The breadcrumb's group link goes to the group's first stage. */
  groupFirstStageId?: StageId;
}

/** Everything StageHeader shows for a stage, from the registry. */
export function stageHeading(stageId: StageId): StageHeading {
  const group = STAGE_GROUPS.find((g) => g.stages.some((s) => s.id === stageId));
  const stage = group?.stages.find((s) => s.id === stageId);
  const family = group ? STAGE_FAMILIES.find((f) => f.id === group.family) : undefined;
  return {
    title: stage?.title ?? stageId,
    description: stage?.description,
    familyTitle: family?.title,
    familyChip: family?.chip,
    groupTitle: group?.title,
    groupFirstStageId: group?.stages[0].id,
  };
}
