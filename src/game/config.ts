import resourcesData from "../../config/resourcesType.json";
import establishmentData from "../../config/establishment.json";
import marketData from "../../config/market.json";
import marketPricingData from "../../config/market-pricing.json";
import questEconomyData from "../../config/quest-economy.json";
import playerStarterData from "../../config/player-starter.json";
import adventurerStarterData from "../../config/adventurer-starter.json";
import craftingData from "../../config/crafting.json";
import {dailyNeedsConfig} from "./systems/adventurers/dailyNeeds";
import type {
  AdventurerStarterConfig,
  AdventurerTemplate,
  CraftingRecipe,
  EquipmentDefinition,
  EstablishmentDefinition,
  ItemDefinition,
  IntelDefinition,
  MarketListing,
  MarketPricingConfig,
  NamePoolDefinition,
  PlayerStarterConfig,
  QuestEconomyConfig,
  QuestTemplate,
  ResourceDefinition
} from "./core/types";

type WorldContentTextData = {
  resources?: Record<string, {
    name?: string | string[];
  }>;
  items?: Record<string, {
    name?: string | string[];
    playerDescription?: string | string[];
    feedbackText?: string | string[];
  }>;
  equipment?: Record<string, {
    name?: string | string[];
    shortName?: string | string[];
    playerDescription?: string | string[];
  }>;
  adventurers?: Record<string, {
    name?: string | string[];
    title?: string | string[];
    motive?: string | string[];
    impression?: string | string[];
    rumor?: string | string[];
  }>;
  quests?: Record<string, {
    title?: string | string[];
    shortTitle?: string | string[];
    description?: string | string[];
    lineTitle?: string | string[];
    focusText?: string | string[];
  }>;
  intel?: Record<string, {
    title?: string | string[];
    content?: string | string[];
    lineTitle?: string | string[];
  }>;
};

type FlexibleTextValue = string | string[] | undefined;

const itemModuleMap = import.meta.glob("../../config/items/*.json", {eager: true});
const equipmentModuleMap = import.meta.glob("../../config/equipment/*.json", {eager: true});
const adventurerModuleMap = import.meta.glob("../../config/adventurers/*.json", {eager: true});
const nameModuleMap = import.meta.glob("../../config/names/*.json", {eager: true});
const resourceTextModuleMap = import.meta.glob("../../config/text/resources/*.json", {eager: true});
const itemTextModuleMap = import.meta.glob("../../config/text/items/*.json", {eager: true});
const equipmentTextModuleMap = import.meta.glob("../../config/text/equipment/*.json", {eager: true});
const adventurerTextModuleMap = import.meta.glob("../../config/text/adventurers/*.json", {eager: true});
const questTextModuleMap = import.meta.glob("../../config/text/quests/*.json", {eager: true});
const intelTextModuleMap = import.meta.glob("../../config/text/intel/*.json", {eager: true});
const worldContentText: WorldContentTextData = {
  resources: Object.assign({}, ...Object.values(resourceTextModuleMap).map((module) => {
    const textFile = module as {default?: WorldContentTextData; resources?: WorldContentTextData["resources"]};
    return textFile.default?.resources ?? textFile.resources ?? {};
  })),
  items: Object.assign({}, ...Object.values(itemTextModuleMap).map((module) => {
    const textFile = module as {default?: WorldContentTextData; items?: WorldContentTextData["items"]};
    return textFile.default?.items ?? textFile.items ?? {};
  })),
  equipment: Object.assign({}, ...Object.values(equipmentTextModuleMap).map((module) => {
    const textFile = module as {default?: WorldContentTextData; equipment?: WorldContentTextData["equipment"]};
    return textFile.default?.equipment ?? textFile.equipment ?? {};
  })),
  adventurers: Object.assign({}, ...Object.values(adventurerTextModuleMap).map((module) => {
    const textFile = module as {default?: WorldContentTextData; adventurers?: WorldContentTextData["adventurers"]};
    return textFile.default?.adventurers ?? textFile.adventurers ?? {};
  })),
  quests: Object.assign({}, ...Object.values(questTextModuleMap).map((module) => {
    const textFile = module as {default?: WorldContentTextData; quests?: WorldContentTextData["quests"]};
    return textFile.default?.quests ?? textFile.quests ?? {};
  })),
  intel: Object.assign({}, ...Object.values(intelTextModuleMap).map((module) => {
    const textFile = module as {default?: WorldContentTextData; intel?: WorldContentTextData["intel"]};
    return textFile.default?.intel ?? textFile.intel ?? {};
  }))
};
export const resourceTextPoolsById = worldContentText.resources ?? {};
export const itemTextPoolsById = worldContentText.items ?? {};
export const equipmentTextPoolsById = worldContentText.equipment ?? {};
export const adventurerTextPoolsById = worldContentText.adventurers ?? {};
export const questTextPoolsById = worldContentText.quests ?? {};
export const intelTextPoolsById = worldContentText.intel ?? {};
export const resources = (resourcesData.resources as ResourceDefinition[]).map((resource) => {
  const text = resourceTextPoolsById[resource.id] ?? {};
  return {
    ...resource,
    name: getDefaultTextValue(text.name, resource.name)
  };
}) as ResourceDefinition[];
export const itemDefinitions = Object.values(itemModuleMap)
  .flatMap((module) => {
    const itemFile = module as {default?: {items?: ItemDefinition[]}; items?: ItemDefinition[]};
    return itemFile.default?.items ?? itemFile.items ?? [];
  })
  .map((item) => {
    const text = itemTextPoolsById[item.id] ?? {};
    const consumableModel = item.consumableModel ?? (item.category === "food" ? "food" : "standard");
    return {
      ...item,
      consumableModel,
      name: getDefaultTextValue(text.name, item.name),
      playerDescription: getDefaultTextValue(text.playerDescription, item.playerDescription),
      feedbackText: getDefaultTextValue(text.feedbackText, item.feedbackText ?? "")
    };
  }) as ItemDefinition[];
export const equipmentDefinitions = Object.values(equipmentModuleMap)
  .flatMap((module) => {
    const equipmentFile = module as {default?: {equipment?: EquipmentDefinition[]}; equipment?: EquipmentDefinition[]};
    return equipmentFile.default?.equipment ?? equipmentFile.equipment ?? [];
  })
  .map((equipment) => {
    const text = equipmentTextPoolsById[equipment.id] ?? {};
    return {
      ...equipment,
      name: getDefaultTextValue(text.name, equipment.name),
      shortName: getDefaultTextValue(text.shortName, equipment.shortName ?? equipment.name),
      playerDescription: getDefaultTextValue(text.playerDescription, equipment.playerDescription)
    };
  }) as EquipmentDefinition[];
export const adventurerTemplates = Object.values(adventurerModuleMap)
  .flatMap((module) => {
    const adventurerFile = module as {default?: {adventurers?: AdventurerTemplate[]}; adventurers?: AdventurerTemplate[]};
    return adventurerFile.default?.adventurers ?? adventurerFile.adventurers ?? [];
  })
  .map((template) => {
    const text = adventurerTextPoolsById[template.textId ?? template.id] ?? {};
    return {
      ...template,
      name: getDefaultTextValue(text.name, template.name),
      title: getDefaultTextValue(text.title, template.title),
      motive: getDefaultTextValue(text.motive, template.motive),
      impression: getDefaultTextValue(text.impression, template.impression),
      rumor: getDefaultTextValue(text.rumor, template.rumor)
    };
  }) as AdventurerTemplate[];
export const namePools = Object.values(nameModuleMap)
  .flatMap((module) => {
    const nameFile = module as {default?: {namePools?: NamePoolDefinition[]}; namePools?: NamePoolDefinition[]};
    return nameFile.default?.namePools ?? nameFile.namePools ?? [];
  }) as NamePoolDefinition[];

const questModuleMap = import.meta.glob("../../config/quests/*.json", {eager: true});
const intelModuleMap = import.meta.glob("../../config/intel/*.json", {eager: true});

export const questTemplates = Object.values(questModuleMap)
  .flatMap((module) => {
    const questFile = module as {default?: {questTemplates?: QuestTemplate[]}; questTemplates?: QuestTemplate[]};
    return questFile.default?.questTemplates ?? questFile.questTemplates ?? [];
  })
  .map((template) => {
    const text = questTextPoolsById[template.textId ?? template.id] ?? {};
    const title = getDefaultTextValue(text.title, template.title);
    return {
      ...template,
      title,
      shortTitle: getDefaultTextValue(text.shortTitle, template.shortTitle ?? title),
      description: getDefaultTextValue(text.description, template.description),
      lineTitle: getDefaultTextValue(text.lineTitle, template.lineTitle ?? ""),
      focusText: getDefaultTextValue(text.focusText, template.focusText ?? "")
    };
  }) as QuestTemplate[];

export const intelDefinitions = Object.values(intelModuleMap)
  .flatMap((module) => {
    const intelFile = module as {default?: {intelDefinitions?: IntelDefinition[]}; intelDefinitions?: IntelDefinition[]};
    return intelFile.default?.intelDefinitions ?? intelFile.intelDefinitions ?? [];
  })
  .map((definition) => {
    const text = intelTextPoolsById[definition.textId ?? definition.id] ?? {};
    return {
      ...definition,
      title: getDefaultTextValue(text.title, definition.title),
      content: getDefaultTextValue(text.content, definition.content),
      lineTitle: getDefaultTextValue(text.lineTitle, definition.lineTitle ?? "")
    };
  }) as IntelDefinition[];

export const establishment = establishmentData.establishment as EstablishmentDefinition;
export const marketId = (marketData.marketId as string) ?? "town-legal";
export const marketListings = marketData.listings as MarketListing[];
export const marketPricing = marketPricingData.pricing as MarketPricingConfig;
export const questEconomyConfig = questEconomyData.questEconomy as QuestEconomyConfig;
export const playerStarter = playerStarterData.starter as PlayerStarterConfig;
export const adventurerStarter = adventurerStarterData as AdventurerStarterConfig;
export const craftingRecipes = craftingData.recipes as CraftingRecipe[];
export {dailyNeedsConfig};

function getDefaultTextValue(value: FlexibleTextValue, fallback: string): string {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}
