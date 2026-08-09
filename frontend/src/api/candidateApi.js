/**
 * 候选人 API 通信服务
 * 兼顾 Electron 环境 (调用 IPC) 与浏览器 Dev 开发环境 (智能 Mock 回退)
 */

export const candidateApi = {
  /**
   * 搜索与筛选候选人列表
   */
  async searchCandidates(params) {
    if (window.recruitment && window.recruitment.candidate && window.recruitment.candidate.search) {
      try {
        const hits = await window.recruitment.candidate.search(params);
        return {
          total: hits.length,
          items: hits,
        };
      } catch (err) {
        console.error('IPC candidate:search error:', err);
      }
    }

    // 浏览器 Dev 预览 Mock 数据回退
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockList = [
          {
            id: 1,
            full_name: '宗磊',
            gender: '女',
            age: 43,
            city: '上海市',
            current_company: '知名日系跨国集团',
            current_position: '高级业务经理 / 市场总监',
            highest_degree_type: '本科',
            work_years: 15,
            primary_phone: '13818082482',
            primary_email: 'zonglei_007@hotmail.com',
            resume_updated_date: '2018-05-14 11:03:39',
            candidate_status: 'active',
          },
          {
            id: 2,
            full_name: '张建国',
            gender: '男',
            age: 38,
            city: '北京市',
            current_company: '某知名科技独角兽',
            current_position: '架构师 / 技术专家',
            highest_degree_type: '硕士',
            work_years: 12,
            primary_phone: '13912345678',
            primary_email: 'zhangjg@example.com',
            resume_updated_date: '2022-10-18 09:30:00',
            candidate_status: 'active',
          },
          {
            id: 3,
            full_name: '李雅静',
            gender: '女',
            age: 32,
            city: '深圳市',
            current_company: '腾讯科技',
            current_position: '高级产品经理',
            highest_degree_type: '本科',
            work_years: 8,
            primary_phone: '18688889999',
            primary_email: 'liyajing@example.com',
            resume_updated_date: '2023-01-05 14:20:10',
            candidate_status: 'active',
          },
        ];

        let filtered = [...mockList];
        if (params.keyword) {
          const kw = params.keyword.toLowerCase();
          filtered = filtered.filter(
            (item) =>
              item.full_name.toLowerCase().includes(kw) ||
              item.current_position.toLowerCase().includes(kw) ||
              item.current_company.toLowerCase().includes(kw) ||
              item.city.toLowerCase().includes(kw)
          );
        }

        resolve({
          total: filtered.length,
          items: filtered,
        });
      }, 300);
    });
  },

  /**
   * 获取候选人详情快照
   */
  async getCandidateDetail(id) {
    if (window.recruitment && window.recruitment.candidate && window.recruitment.candidate.get) {
      try {
        return await window.recruitment.candidate.get(id);
      } catch (err) {
        console.error('IPC candidate:get error:', err);
      }
    }

    // Mock 详情数据
    return {
      profile: {
        id,
        full_name: '宗磊',
        gender: '女',
        age: 43,
        birth_date: '1983-07-16',
        city: '上海市',
        marital_status: '未婚',
        household_registration: '江苏无锡',
        address: '上海市长宁区虹桥路1115号',
        primary_phone: '13818082482',
        primary_email: 'zonglei_007@hotmail.com',
        current_company: '知名日系跨国集团',
        current_position: '高级业务经理',
        current_industry: '化工 / 医疗 / 贸易',
        highest_school: '无锡大学',
        highest_major: '国际贸易与日语',
        highest_degree_type: '本科',
        work_years: 15,
        personal_summary:
          '具有东京工作经验，熟悉日系企业经营方式与企业文化。精通危险化学品出口贸易及新工厂项目筹建。',
      },
      contacts: [
        { contact_type: 'phone', contact_value: '13818082482', is_primary: 1 },
        { contact_type: 'email', contact_value: 'zonglei_007@hotmail.com', is_primary: 0 },
      ],
      expectations: [
        {
          expected_position: '高级业务经理 / 事业部总监',
          expected_city: '上海市',
          expected_industry: '国际贸易 / 日资制造',
          expected_salary_text: '35k-50k * 14薪',
          expected_employment_type: '全职',
          expected_start_date: '即时',
        },
      ],
      workExperiences: [
        {
          company_name: '三菱瓦斯化学（上海）有限公司',
          position_title: '高级业务经理',
          department: '营业二部',
          start_date: '2016-06',
          end_date: '2023-08',
          is_current: 0,
          responsibilities: '负责脱氧剂及食品/医药高分子保鲜材料在华东区的市场拓展、渠道建设与大客户谈判。',
          achievements: '连续三年超额完成销售 KPI，年销售额突破 8000 万人民币。',
        },
      ],
      educations: [
        {
          school_name: '江南大学',
          major_name: '日语与国际贸易',
          degree_type: '本科',
          start_date: '2001-09',
          end_date: '2005-07',
          is_highest: 1,
        },
      ],
      languages: [
        { language_name: '日语', proficiency_level: '流利 / 商务级', certificate_name: 'N1 级' },
        { language_name: '英语', proficiency_level: '熟练', certificate_name: 'CET-4' },
      ],
      skills: [
        { skill_name: '国际贸易', proficiency_level: '精通' },
        { skill_name: '日企商务谈判', proficiency_level: '精通' },
        { skill_name: '危险品供应链管理', proficiency_level: '熟练' },
      ],
      communications: [
        {
          communication_date: '2026-08-05 15:30',
          communication_type: '电话沟通',
          summary: '候选人目前在看新机会，期望总包 60W 上下，对外企/日企优先考虑。',
        },
      ],
    };
  },

  /**
   * 获取人才库总记录数
   */
  async getCandidateCount() {
    if (window.recruitment && window.recruitment.candidate && window.recruitment.candidate.count) {
      try {
        return await window.recruitment.candidate.count();
      } catch (err) {
        console.error('IPC candidate:count error:', err);
      }
    }
    return 9860;
  },
};
