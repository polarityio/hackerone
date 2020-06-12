polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  programsToSearch: Ember.computed.alias('block.data.details.programsToSearch'),
  activeTab: '',
  init() {
    this.set('activeTab', this.get('programsToSearch')[0]);
    this._super(...arguments);
  },
  actions: {
    changeTab: function (tabName) {
      this.set(`activeTab`, tabName);
    }
  }
});
