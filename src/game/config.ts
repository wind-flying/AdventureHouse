import resourcesData from "../../config/resourcesType.json";
import type {
  AdventurerTemplate,
  IntelDefinition,
  NamePoolDefinition,
  QuestTemplate,
  ResourceDefinition
} from "./core/types";

type WorldContentTextData = {
  adventurers?: Record<string, {
    name?: string | string[];
    title?: string | string[];
    motive?: string | string[];
    impression?: string | string[];
    rumor?: string | string[];
  }>;
  quests?: Record<string, {
    title?: string | string[];
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

export const resources = resourcesData.resources as ResourceDefinition[];
const adventurerModuleMap = import.meta.glob("../../config/adventurers/*.json", {eager: true});
const nameModuleMap = import.meta.glob("../../config/names/*.json", {eager: true});
const adventurerTextModuleMap = import.meta.glob("../../config/text/adventurers/*.json", {eager: true});
const questTextModuleMap = import.meta.glob("../../config/text/quests/*.json", {eager: true});
const intelTextModuleMap = import.meta.glob("../../config/text/intel/*.json", {eager: true});
const worldContentText: WorldContentTextData = {
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
export const adventurerTextPoolsById = worldContentText.adventurers ?? {};
export const questTextPoolsById = worldContentText.quests ?? {};
export const intelTextPoolsById = worldContentText.intel ?? {};
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
    return {
      ...template,
      title: getDefaultTextValue(text.title, template.title),
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

function getDefaultTextValue(value: FlexibleTextValue, fallback: string): string {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}
