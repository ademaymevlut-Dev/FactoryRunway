import type { AwardCategory, AwardScope } from "@/generated/prisma/enums";
import {
  normalizeLocale,
  preferredTranslation,
  type SupportedLocale,
} from "@/lib/i18n/locales";

export type AwardDefinitionTranslationInput = {
  description: string | null;
  locale: string;
  name: string;
};

export type AwardDefinitionInput = {
  category: AwardCategory;
  id: string;
  key: string;
  rewardCashCents: bigint | null;
  rewardMetadata: unknown;
  rewardXp: number;
  scope: AwardScope;
  scopeKey: string;
  sortOrder: number;
  targetValue: number;
  translations: AwardDefinitionTranslationInput[];
};

export type AwardDefinitionView = {
  category: AwardCategory;
  description: string | null;
  id: string;
  key: string;
  name: string;
  rewardCashCents: string | null;
  rewardMetadata: unknown;
  rewardXp: number;
  scope: AwardScope;
  scopeKey: string;
  sortOrder: number;
  targetValue: number;
};

export function buildAwardDefinitionViews(input: {
  definitions: AwardDefinitionInput[];
  locale?: SupportedLocale;
}): AwardDefinitionView[] {
  const locale = normalizeLocale(input.locale);

  return [...input.definitions]
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((definition) => toAwardDefinitionView(definition, locale));
}

function toAwardDefinitionView(
  definition: AwardDefinitionInput,
  locale: SupportedLocale,
): AwardDefinitionView {
  const translation = preferredTranslation(definition.translations, locale);

  return {
    category: definition.category,
    description: translation?.description ?? null,
    id: definition.id,
    key: definition.key,
    name: translation?.name ?? definition.key,
    rewardCashCents: definition.rewardCashCents?.toString() ?? null,
    rewardMetadata: definition.rewardMetadata,
    rewardXp: definition.rewardXp,
    scope: definition.scope,
    scopeKey: definition.scopeKey,
    sortOrder: definition.sortOrder,
    targetValue: Math.max(1, definition.targetValue),
  };
}
