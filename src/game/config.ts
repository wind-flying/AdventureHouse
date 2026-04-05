import resourcesData from "../../config/resourcesType.json";
import adventurersData from "../../config/adventurers.json";
import type {AdventurerTemplate, IntelDefinition, QuestTemplate, ResourceDefinition} from "./core/types";

export const resources = resourcesData.resources as ResourceDefinition[];
export const adventurerTemplates = adventurersData.adventurers as AdventurerTemplate[];

const questModuleMap = import.meta.glob("../../config/quests/*.json", {eager: true});
const intelModuleMap = import.meta.glob("../../config/intel/*.json", {eager: true});

export const questTemplates = Object.values(questModuleMap)
  .flatMap((module) => {
    const questFile = module as {default?: {questTemplates?: QuestTemplate[]}; questTemplates?: QuestTemplate[]};
    return questFile.default?.questTemplates ?? questFile.questTemplates ?? [];
  }) as QuestTemplate[];

export const intelDefinitions = Object.values(intelModuleMap)
  .flatMap((module) => {
    const intelFile = module as {default?: {intelDefinitions?: IntelDefinition[]}; intelDefinitions?: IntelDefinition[]};
    return intelFile.default?.intelDefinitions ?? intelFile.intelDefinitions ?? [];
  }) as IntelDefinition[];
