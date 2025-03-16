import * as core from "@actions/core";
import { render } from "micromustache";
import { testRule, Rule } from "./rule.js";
import { loadRules } from "./rule-loader.js";

const parseTemplate = (template: string[]) => {
  return template
    .map((it) => it.split(":", 2))
    .reduce(
      (acc, [k, v]) => {
        if (k) acc[k] = v;
        return acc;
      },
      {} as Record<string, string>,
    );
};

const parseInput = () => {
  const data = core.getInput("data");
  const ruleFile = core.getInput("rule-file");
  const templateInput = core.getMultilineInput("template");
  const fallbackTemplateInput = core.getMultilineInput("fallback-template");
  const template = parseTemplate(templateInput);
  const fallbackTemplate = parseTemplate(fallbackTemplateInput);
  core.debug(`parsedTemplate: ${JSON.stringify(template)}`);
  core.debug(`parsedFallbackTemplate: ${JSON.stringify(fallbackTemplate)}`);
  const parsedData = JSON.parse(data);
  core.debug(`parsedData: ${JSON.stringify(parsedData)}`);
  return {
    rules: loadRules(ruleFile),
    data: parsedData,
    template,
    fallbackTemplate,
  };
};

const handleTemplate = (template: Record<string, string>, data: any) => {
  const keys = Object.keys(template);
  for (const k of keys) {
    core.setOutput(k, render(template[k], data));
  }
};
function isNotEmpty(obj: any) {
  return Object.keys(obj).length !== 0;
}
function main() {
  const input = parseInput();
  if (isNotEmpty(input.template)) {
    handleTemplate(input.template, input.data);
    return;
  }
  core.info(`not found template, use preset rule`);
  for (const rule of input.rules) {
    const r = { and: rule.and, or: rule.and } as Rule;
    if (testRule(r, input.data)) {
      core.info(`match rule: ${rule.id}`);
      const keys = Object.keys(rule.template);
      for (const k of keys) {
        core.setOutput(k, render(rule.template[k], input.data));
      }
      return;
    }
  }
  core.info(`not found matched preset rule, use fallback rule`);
  if (isNotEmpty(input.fallbackTemplate)) {
    handleTemplate(input.fallbackTemplate, input.data);
    return;
  }
  core.warning(`not found fallback rule, skip`);
}

main();
