const IGNORED_IPS = new Set(['127.0.0.1', '255.255.255.255', '0.0.0.0']);

const STRUCTURED_SCOPES_EDGES = `
  edges {
    node {
      id
      asset_identifier
      asset_type
      created_at
      eligible_for_bounty
      eligible_for_submission
      instruction
      max_severity
    }
  }
`;

const GET_ALL_REPORTS_QUERY = `
  reports(handle: $handle, limit: 200, order_by: { direction: ASC, field: created_at }) {
    nodes {
      id
      title
      vulnerability_information
      jira_escalation_state
      substate
      created_at
      url
      reporter{
        id
        profile_picture(size: medium)
        name
        username
        rank
        reputation
        bio
        resolved_report_count
        website
        location
        hackerone_employee
        cleared
        bugcrowd_handle
        github_handle
        gitlab_handle
        linkedin_handle
        twitter_handle
      }
      custom_field_values {
        nodes {
          value
        }
      }
      weakness {
        id
        name
        description
        external_id
      }
      triage_meta {
        id
        url
      }
      custom_field_values {
        nodes {
          value
        }
      }
      summaries {
        content
        created_at
        id
        updated_at
      }
      structured_scope {  
        id
        asset_identifier
        asset_type
        created_at
        eligible_for_bounty
        eligible_for_submission
        instruction
        max_severity
      }
      severity {
        id
        attack_complexity
        attack_vector
        author_type
        availability
        confidentiality
        rating
        scope
        score
      }
    }
  }
`;

module.exports = {
  IGNORED_IPS,
  STRUCTURED_SCOPES_EDGES,
  GET_ALL_REPORTS_QUERY
};
