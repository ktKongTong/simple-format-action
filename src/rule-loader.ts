import { RuleItemSchema, TemplateRule } from "./rule.js";
import * as fs from "fs";
import { parse } from "yaml";
import * as core from "@actions/core";

const defaultRuleFiles = ["template.rule.yml", "template.rule.yaml"];

export const readRuleFromFile = (file: string) => {
  let rules = [] as TemplateRule[];
  if (fs.existsSync(file)) {
    try {
      const text = fs.readFileSync(file, "utf-8");
      const res = parse(text);
      core.debug(`yaml parsed result: ${JSON.stringify(res)}`);
      rules = RuleItemSchema.array().parse(res) as TemplateRule[];
    } catch (e) {
      // @ts-ignore
      core.error(`read rule file [${file}] error: ${e?.message}`);
    }
  } else {
    core.info(`rule file not exist: ${file}`);
  }

  return rules;
};

export const loadRuleFiles = (ruleFile?: string) => {
  let ruleFiles: string[] = [];
  if (ruleFile) {
    ruleFiles = [ruleFile];
  } else {
    for (const rf of defaultRuleFiles) {
      if (fs.existsSync(rf)) {
        ruleFiles.push(rf);
        break;
      }
    }
  }
  return ruleFiles;
};

export const loadRules = (ruleFile?: string) => {
  let rules = [] as TemplateRule[];
  for (const rf of loadRuleFiles(ruleFile)) {
    rules.push(...readRuleFromFile(rf));
  }
  return rules;
};
