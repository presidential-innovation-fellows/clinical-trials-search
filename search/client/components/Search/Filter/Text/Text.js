import React, { Component, PropTypes } from 'react';
import TagsInput from 'react-tagsinput';

import Url from '../../../../lib/Url';

import './Text.scss';

class Text extends Component {

  constructor() {
    super();

    this.className = "filter-text";

    this.state = {
      selectedValues: [],
      inputText: "",
      placeholderText: ""
    }

    this.onChange = this.onChange.bind(this);
    this.onInputChange = this.onInputChange.bind(this);
  }

  static propTypes = {
    paramField: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired
  };

  escapeRegexCharacters(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  loadValuesState() {
    let params = Url.getParams();
    let values = params[this.props.paramField] || [];
    if (JSON.stringify(this.state.selectedValues) !== JSON.stringify(values)) {
      this.setState({
        selectedValues: values
      });
    }
  }

  componentDidMount() {
    this.loadValuesState();
  }

  componentWillUpdate() {
    this.loadValuesState();
  }

  onChange(values) {
    let params = {};
    params[this.props.paramField] = [];
    if (values && values.length) {
      params[this.props.paramField] = values;
    }
    Url.overwriteParams({ path: "/clinical-trials", params });

    this.setState({ selectedValues: values });
  }

  onInputChange(input) {
    this.setState({ inputText: this.escapeRegexCharacters(input) });
  }

  renderTag(props) {
    let {tag, key, onRemove, classNameRemove, ...other} = props
    return (
      <span key={key} {...other}>
        <a className={classNameRemove} onClick={(e) => onRemove(key)} />
        {tag}
      </span>
    )
  }

  render() {
    const { paramField, displayName } = this.props;
    const htmlId = paramField.split(".").join("-");
    const inputProps = {
      id: htmlId,
      placeholder: ""
    };

    return (
      <div className={this.className}>
        <label htmlFor={htmlId}>{displayName}</label>
        <TagsInput value={this.state.selectedValues}
                   onChange={::this.onChange}
                   renderTag={this.renderTag}
                   inputProps={inputProps}/>
      </div>
    );
  }

}

export default Text;
