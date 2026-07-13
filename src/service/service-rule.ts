// 防御规则编辑器的数据结构模板（与后端 RuleInfo JSON 结构一致）

export const RULE = {
  is_manual_rule: '1',
  rule_status: 1,
  rule_content: '',
  // 命中动作：deny(拦截,默认) / allow(放行) / log(仅记录)
  rule_action: 'deny',
  // allow 时可跳过的检测模块（["ALL"]=全部）
  rule_action_skips: [] as string[],
  rule_base: {
    salience: 10,
    rule_name: '规则名称',
    rule_domain_code: '请选择网站',
  },
  rule_condition: {
    relation_detail: [
      {
        fact_name: 'MF',
        attr: 'URL',
        attr_type: 'string',
        attr_judge: '==',
        attr_val: '/',
      },
    ],
    relation_symbol: '&&',
  },
  rule_do_assignment: [],
  rule_do_method: [],
};

export const RULE_RELATION_DETAIL = {
  fact_name: 'MF',
  attr: 'HOST',
  attr_type: '',
  attr_judge: '==',
  attr_val: '',
  attr_val2: 'True',
};

export const RULE_DO_ASSIGNMENT = {
  fact_name: '',
  attr: 'HOST',
  attr_type: 'string',
  attr_val: '',
};

export const RULE_DO_METHOD = {
  fact_name: '',
  method_name: '',
  parms: [],
};

export const RULE_DO_METHOD_PARM = {
  attr_type: 'string',
  attr_val: '',
};
