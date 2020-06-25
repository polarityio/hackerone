polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  programsToSearch: Ember.computed.alias('block.data.details.programsToSearch'),
  activeTab: '',
  programHasResultsMap: {},
  dropdownExpanded: {},
  init() {
    this.set(
      'activeTab',
      this.get('programsToSearch').filter(({ id: programId }) =>
        ['scopes', 'cwes', 'reports', 'reporters'].some((dataType) => {
          const dataList = this.get('details')[dataType][programId];
          return dataList && dataList.length;
        })
      )[0].id
    );
    this.set(
      'programHasResultsMap',
      this.get('programsToSearch').reduce(
        (agg, { id: programId }) =>
          Object.assign({}, agg, {
            [programId]: ['scopes', 'cwes', 'reports', 'reporters'].some((dataType) => {
              const dataList = this.get('details')[dataType][programId];
              return dataList && dataList.length;
            })
          }),
        {}
      )
    );
    this._super(...arguments);
  },
  actions: {
    changeTab: function (tabName) {
      this.set(`activeTab`, tabName);
    },
    toggleExpand: function (programId, dataType, index) {
      const modifiedDropdownExpanded = Object.assign({}, this.get('dropdownExpanded'), {
        [programId]: Object.assign(
          {},
          this.get('dropdownExpanded') && this.get('dropdownExpanded')[programId],
          {
            [dataType]: Object.assign(
              {},
              this.get('dropdownExpanded') &&
                this.get('dropdownExpanded')[programId] &&
                this.get('dropdownExpanded')[programId][dataType],
              {
                [index]: !(
                  this.get('dropdownExpanded') &&
                  this.get('dropdownExpanded')[programId] &&
                  this.get('dropdownExpanded')[programId][dataType] &&
                  this.get('dropdownExpanded')[programId][dataType][index]
                )
              }
            )
          }
        )
      });

      this.set(`dropdownExpanded`, modifiedDropdownExpanded);
    }
  }
});
