polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  programsToSearch: Ember.computed.alias('block.data.details.programsToSearch'),
  __activeTab: '',
  actions: {
    changeTab: function(tabName) {
      this.set(`__activeTab`, tabName);
    },
  },
});
