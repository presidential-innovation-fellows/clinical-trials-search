import React, { Component, PropTypes } from 'react';

import './ToggleMore.scss';

export default class extends Component {

  constructor() {
    super();

    this.state = {
      isShowingMore: false,
      canShowMore: false
    };

    this.toggleMore = this.toggleMore.bind(this);
  }

  static propTypes = {
    items: PropTypes.array.isRequired,
    itemKey: PropTypes.string,
    numToShow: PropTypes.number
  };

  componentDidMount() {
    const { items, numToShow } = this.props;
    if (items.length > numToShow) {
      this.setState({
        canShowMore: true
      });
    }
  }

  toggleMore() {
    this.setState({
      isShowingMore: !this.state.isShowingMore
    });
  }

  render() {
    const { items, numToShow, itemKey } = this.props;
    let { canShowMore, isShowingMore } = this.state;
    const delim = ", ";
    let showItems = items.map((item) => {
      if (itemKey) {
        return item[itemKey];
      }
      return item;
    });
    if (canShowMore && !isShowingMore) {
      showItems = showItems.slice(0, numToShow);
    }

    var canShowMoreToggle;
    if (canShowMore) {
      if (isShowingMore) {
        canShowMoreToggle = (
          <span className="toggle-more" onClick={this.toggleMore}>show less</span>
        )
      } else {
        canShowMoreToggle = (
          <span className="toggle-more" onClick={this.toggleMore}>show more</span>
        )
      }
    }

    return (
      <span>
        {showItems.join(delim)}
        {canShowMore && !isShowingMore ? "... " : " "}
        {canShowMoreToggle}
      </span>
    );
  }

}
