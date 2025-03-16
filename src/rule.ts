import { z } from "zod";
import * as core from "@actions/core";

export type Rule = {
  and?: Rule;
  or?: Rule;
} & Record<string, string>;

export type TemplateRule = {
  id: string;
  and?: Rule;
  or?: Rule;
  template: Record<string, string>;
};
export const RuleSchema: z.ZodType<Rule> = z.lazy(() =>
  z
    .object({
      and: RuleSchema.optional(),
      or: RuleSchema.optional(),
    })
    .catchall(z.coerce.string()),
);

export const RuleItemSchema = z.object({
  id: z.string(),
  and: RuleSchema.optional(),
  or: RuleSchema.optional(),
  template: z.record(z.coerce.string()),
});

// export const RuleItemSchema = z
//   .object({
//     id: z.string(),
//     template: z.record(z.string(), z.string()).optional(),
//   })
//   .extend(RuleSchema);

type RuleItem = {
  key: string;
  cond: string;
};

const applyRuleItem = (rule: RuleItem, data: any) => {
  try {
    const keys = rule.key.split(".");
    let cur = data;
    for (const key of keys) {
      cur = cur[key];
    }
    const v = cur?.toString();
    if (v === rule.cond) return true;
    const reg = new RegExp(rule.cond);
    return reg.test(v);
  } catch (e) {
    core.warning(
      // @ts-ignore
      `some error happen while applying rule ${JSON.stringify(rule)}: ${e?.message}`,
    );
    return false;
  }
};

const applyAndRule = (rules: RuleItem[], data: any) => {
  if (rules.length === 0) return true;
  for (const rule of rules) {
    const ok = applyRuleItem(rule, data);
    if (!ok) return ok;
  }
  return true;
};

const applyOrRule = (rules: RuleItem[], data: any) => {
  if (rules.length === 0) return true;
  for (const rule of rules) {
    const ok = applyRuleItem(rule, data);
    if (ok) return ok;
  }
  return false;
};

export const testRule = (
  matchRule: Rule,
  data: any,
  cur: "and" | "or" = "and",
) => {
  try {
    const subAndRule = matchRule.and;
    const subOrRule = matchRule.or;
    delete matchRule["and"];
    delete matchRule["or"];
    let subAndRuleRes = true;
    let subOrRuleRes = true;
    if (subAndRule) {
      subAndRuleRes = testRule(subAndRule, data, "and");
    }
    if (subOrRule) {
      subOrRuleRes = testRule(subOrRule, data, "or");
    }
    // and rule: return early when some rule false
    if (cur === "and" && !(subAndRuleRes && subOrRuleRes)) return false;
    // or rule: return early when some rule true
    if (cur === "or" && (subAndRuleRes || subOrRuleRes)) return true;
    const conds = Object.keys(matchRule).map((key) => ({
      key: key,
      cond: matchRule[key],
    }));
    if (cur === "and") return applyAndRule(conds, data);
    if (cur === "or") return applyOrRule(conds, data);
    core.warning(`unexpected match rule type: ${JSON.stringify(matchRule)}`);
    return false;
  } catch (e) {
    core.warning(`some error happen while apply rules, ${e?.toString()}`);
    return false;
  }
};
