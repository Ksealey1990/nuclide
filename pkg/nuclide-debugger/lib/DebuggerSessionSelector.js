'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import DebuggerActions from './DebuggerActions';
import {DebuggerProcessInfo} from '../../nuclide-debugger-base';
import {DebuggerStore} from './DebuggerStore';
import {React} from 'react-for-atom';
import {
  Button,
  ButtonTypes,
} from '../../nuclide-ui/lib/Button';
import {ButtonToolbar} from '../../nuclide-ui/lib/ButtonToolbar';

type Props = {
  actions: DebuggerActions,
  store: DebuggerStore,
};

type State = {
  selectedProcess: ?DebuggerProcessInfo,
  processes: Array<DebuggerProcessInfo>,
  debuggerStoreChangeListener: ?IDisposable,
};

/**
 * View for setting up a new debugging session.
 */
export default class DebuggerSessionSelector extends React.Component {
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);

    this.state = {
      processes: [],
      selectedProcess: null,
      debuggerStoreChangeListener: null,
    };

    (this: any)._updateProcessList = this._updateProcessList.bind(this);
    (this: any)._renderProcessChoices = this._renderProcessChoices.bind(this);
    (this: any)._handleSelectProcess = this._handleSelectProcess.bind(this);
    (this: any)._handleClick = this._handleClick.bind(this);
  }

  componentWillMount() {
    this.setState({
      debuggerStoreChangeListener: this.props.store.onChange(this._updateProcessList),
    });
    this._updateProcessList();
  }

  componentWillUnmount() {
    const listener = this.state.debuggerStoreChangeListener;
    if (listener != null) {
      listener.dispose();
    }
  }

  render(): React.Element<any> {
    return (
      <section className="padded">
        <h2>Attach to Process</h2>
        <div className="form">
          <div className="form-group">
            <select
              className="form-control"
              onChange={this._handleSelectProcess}
              value={this.state.selectedProcess == null
                ? ''
                : this.state.processes.indexOf(this.state.selectedProcess)
              }>
              <option disabled>
                Process ID
              </option>
              {this._renderProcessChoices()}
            </select>
          </div>
          <ButtonToolbar className="form-group">
            <Button
              buttonType={ButtonTypes.PRIMARY}
              onClick={this._handleClick}
              disabled={this.state.selectedProcess === null}>
              Attach
            </Button>
            <Button onClick={this._updateProcessList}>
              Refresh List
            </Button>
          </ButtonToolbar>
        </div>
      </section>
    );
  }

  _updateProcessList(): void {
    this.props.store.getProcessInfoList().then(processList => {
      this.setState({
        processes: processList.sort(compareDebuggerProcessInfo)});
    });
  }

  _renderProcessChoices(): Array<React.Element<any>> {
    return this.state.processes
      .map((item, index) =>
        <option key={item.toString()} value={index}>
          {item.toString()}
        </option>,
      );
  }

  _handleSelectProcess(e: any) {
    this.setState({
      selectedProcess: this.state.processes[e.target.value],
    });
  }

  _handleClick(e: any) {
    if (this.state.selectedProcess) {
      // fire and forget.
      this.props.actions.startDebugging(this.state.selectedProcess);
    }
  }
}

function compareDebuggerProcessInfo(
  value: DebuggerProcessInfo,
  other: DebuggerProcessInfo,
): number {
  const cmp = value.getServiceName().localeCompare(other.getServiceName());
  if (cmp === 0) {
    return value.compareDetails(other);
  } else {
    return cmp;
  }
}