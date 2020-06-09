polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  summary: Ember.computed.alias('block.data.summary'),
  incidents: Ember.computed.alias('details.incidents'),
  playbooks: Ember.computed.alias('details.playbooks'),
  baseUrl: Ember.computed.alias('details.baseUrl'),
  entityValue: Ember.computed.alias('block.entity.value'),
  onDemand: Ember.computed('block.entity.requestContext.requestType', function() {
    return this.block.entity.requestContext.requestType === 'OnDemand';
  }),
  incidentMessage: '',
  incidentErrorMessage: '',
  incidentPlaybookId: null,
  isRunning: false,
  actions: {
    changeTab: function(incidentIndex, tabName) {
      this.set(`incidents.${incidentIndex}.__activeTab`, tabName);
    },
    runPlaybook: function(playbookId, incidentIndex, incidentId) {
      const outerThis = this;
      if (!playbookId) return this.setMessage(incidentIndex, 'Select a playbook to run.');

      this.setMessage(incidentIndex, '');
      this.setRunning(incidentIndex, true);
      this.get('block').notifyPropertyChange('data');

      this.sendIntegrationMessage({
        data: {
          entityValue: this.block.entity.value,
          incidentId,
          playbookId
        }
      })
        .then(({ pbHistory, newIncident, newSummary }) => {
          if (newIncident) {
            outerThis.setIncident(newIncident);
            incidentIndex = 0;
          }

          if (newSummary) outerThis.setSummary(newSummary);
          if (pbHistory) outerThis.setPlaybookRunHistory(incidentIndex, pbHistory);

          outerThis.setMessage(incidentIndex, 'Successfully Ran Playbook');
        })
        .catch((err) => {
          outerThis.setErrorMessage(
            incidentIndex,
            `Failed: ${err.message || err.title || err.description || 'Unknown Reason'}`
          );
        }).finally(() => {
          outerThis.setRunning(incidentIndex, false);
          outerThis.get('block').notifyPropertyChange('data');
        });
    }
  },

  setMessage(incidentIndex, msg) {
    if (Number.isInteger(incidentIndex)) {
      this.set(`incidents.${incidentIndex}.__message`, msg);
    } else {
      this.set('incidentMessage', msg);
    }
  },

  setSummary(tags) {
    this.set('summary', tags);
  },

  setPlaybookRunHistory(incidentIndex, pbHistory) {
    this.set(`incidents.${incidentIndex}.pbHistory`, pbHistory);
  },

  setIncident(newIncident) {
    this.set(`incidents`, [newIncident]);
  },

  setErrorMessage(incidentIndex, msg) {
    if (Number.isInteger(incidentIndex)) {
      this.set(`incidents.${incidentIndex}.__errorMessage`, msg);
    } else {
      this.set('incidentErrorMessage', msg);
    }
  },

  setRunning(incidentIndex, isRunning) {
    if (Number.isInteger(incidentIndex)) {
      this.set(`incidents.${incidentIndex}.__running`, isRunning);
    } else {
      this.set('isRunning', isRunning);
    }
  }
});
