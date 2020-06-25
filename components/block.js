polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  programsToSearch: Ember.computed.alias('block.data.details.programsToSearch'),
  activeTab: '',
  programHasResultsMap: {},
  dropdownExpanded: {},
  init() {
    this.set(
      'activeTab',
      this.get('programsToSearch').filter((program) =>
        ['scopes', 'cwes', 'reports', 'reporters'].some((dataType) => {
          const dataList = this.get('details')[dataType][program];
          return dataList && dataList.length;
        })
      )[0]
    );
    this.set(
      'programHasResultsMap',
      this.get('programsToSearch').reduce(
        (agg, program) =>
          Object.assign({}, agg, {
            [program]: ['scopes', 'cwes', 'reports', 'reporters'].some((dataType) => {
              const dataList = this.get('details')[dataType][program];
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
    toggleExpand: function (program, dataType, index) {
      const modifiedDropdownExpanded = Object.assign({}, this.get('dropdownExpanded'), {
        [program]: Object.assign(
          {},
          this.get('dropdownExpanded') && this.get('dropdownExpanded')[program],
          {
            [dataType]: Object.assign(
              {},
              this.get('dropdownExpanded') &&
                this.get('dropdownExpanded')[program] &&
                this.get('dropdownExpanded')[program][dataType],
              {
                [index]: !(
                  this.get('dropdownExpanded') &&
                  this.get('dropdownExpanded')[program] &&
                  this.get('dropdownExpanded')[program][dataType] &&
                  this.get('dropdownExpanded')[program][dataType][index]
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
