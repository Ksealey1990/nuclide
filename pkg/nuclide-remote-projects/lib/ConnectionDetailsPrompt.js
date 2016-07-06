'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import addTooltip from '../../nuclide-ui/lib/add-tooltip';
import classnames from 'classnames';
import ConnectionDetailsForm from './ConnectionDetailsForm';
import {HR} from '../../nuclide-ui/lib/HR';
import {MutableListSelector} from '../../nuclide-ui/lib/MutableListSelector';
import {React} from 'react-for-atom';

import type {
  NuclideRemoteConnectionParams,
  NuclideRemoteConnectionParamsWithPassword,
  NuclideRemoteConnectionProfile,
} from './connection-types';

type Props = {
  // The initial list of connection profiles that will be displayed.
  // Whenever a user add/removes profiles via the child NuclideListSelector,
  // these props should be updated from the top-level by calling ReactDOM.render()
  // again (with the new props) on the ConnectionDetailsPrompt.
  connectionProfiles: ?Array<NuclideRemoteConnectionProfile>;
  // If there is >= 1 connection profile, this index indicates the profile to use.
  indexOfSelectedConnectionProfile: ?number;
  // Function to call when 'enter'/'confirm' is selected by the user in this view.
  onConfirm: () => mixed;
  // Function to call when 'cancel' is selected by the user in this view.
  onCancel: () => mixed;
  onDidChange: () => mixed;
  // Function that is called when the "+" button on the profiles list is clicked.
  // The user's intent is to create a new profile.
  onAddProfileClicked: () => mixed;
  // Function that is called when the "-" button on the profiles list is clicked
  // ** while a profile is selected **.
  // The user's intent is to delete the currently-selected profile.
  onDeleteProfileClicked: (indexOfSelectedConnectionProfile: number) => mixed;
  onProfileClicked: (indexOfSelectedConnectionProfile: number) => mixed;
};

/**
 * This component contains the entire view in which the user inputs their
 * connection information when connecting to a remote project.
 * This view contains the ConnectionDetailsForm on the left side, and a
 * NuclideListSelector on the right side that displays 0 or more connection
 * 'profiles'. Clicking on a 'profile' in the NuclideListSelector auto-fills
 * the form with the information associated with that profile.
 */
export default class ConnectionDetailsPrompt extends React.Component {
  props: Props;

  _settingFormFieldsLock: boolean;

  constructor(props: Props) {
    super(props);
    this._settingFormFieldsLock = false;

    (this: any)._handleConnectionDetailsFormDidChange =
      this._handleConnectionDetailsFormDidChange.bind(this);
    (this: any)._onDefaultProfileClicked = this._onDefaultProfileClicked.bind(this);
    (this: any)._onDeleteProfileClicked = this._onDeleteProfileClicked.bind(this);
    (this: any)._onProfileClicked = this._onProfileClicked.bind(this);
  }

  componentDidUpdate(prevProps: Props, prevState: void) {
    // Manually update the contents of an existing `ConnectionDetailsForm`, because it contains
    // `AtomInput` components (which don't update their contents when their props change).
    if (
      prevProps.indexOfSelectedConnectionProfile !== this.props.indexOfSelectedConnectionProfile
      || (
        // If the connection profiles changed length, the effective selected profile also changed.
        prevProps.connectionProfiles != null
        && this.props.connectionProfiles != null
        && prevProps.connectionProfiles.length !== this.props.connectionProfiles.length
      )
    ) {
      const existingConnectionDetailsForm = this.refs['connection-details-form'];
      if (existingConnectionDetailsForm) {
        // Setting values in the ConnectionDetailsForm fires change events. However, this is a
        // controlled update that should not trigger any change events. "Lock" change events until
        // synchronous updates to the form are complete.
        this._settingFormFieldsLock = true;
        existingConnectionDetailsForm.setFormFields(this.getPrefilledConnectionParams());
        existingConnectionDetailsForm.clearPassword();
        this._settingFormFieldsLock = false;
        existingConnectionDetailsForm.focus();
      }
    }
  }

  focus(): void {
    this.refs['connection-details-form'].focus();
  }

  getFormFields(): NuclideRemoteConnectionParamsWithPassword {
    return this.refs['connection-details-form'].getFormFields();
  }

  getPrefilledConnectionParams(): ?NuclideRemoteConnectionParams {
    // If there are profiles, pre-fill the form with the information from the specified selected
    // profile.
    if (this.props.connectionProfiles != null &&
        this.props.connectionProfiles.length > 0 &&
        this.props.indexOfSelectedConnectionProfile != null) {
      const selectedProfile =
        this.props.connectionProfiles[this.props.indexOfSelectedConnectionProfile];
      return selectedProfile.params;
    }
  }

  _handleConnectionDetailsFormDidChange(): void {
    if (this._settingFormFieldsLock) {
      return;
    }

    this.props.onDidChange();
  }

  _onDefaultProfileClicked(): void {
    this.props.onProfileClicked(0);
  }

  _onDeleteProfileClicked(profileId: ?string): void {
    if (profileId == null) {
      return;
    }

    // The id of a profile is its index in the list of props.
    // * This requires a `+ 1` because the default profile is sliced from the Array during render
    //   creating an effective offset of -1 for each index passed to the `MutableListSelector`.
    this.props.onDeleteProfileClicked(parseInt(profileId, 10) + 1);
  }

  _onProfileClicked(profileId: string): void {
    // The id of a profile is its index in the list of props.
    // * This requires a `+ 1` because the default profile is sliced from the Array during render
    //   creating an effective offset of -1 for each index passed to the `MutableListSelector`.
    this.props.onProfileClicked(parseInt(profileId, 10) + 1);
  }

  render(): React.Element<any> {

    // If there are profiles, pre-fill the form with the information from the
    // specified selected profile.
    const prefilledConnectionParams = this.getPrefilledConnectionParams() || {};

    let defaultConnectionProfileList;
    let listSelectorItems;
    const connectionProfiles = this.props.connectionProfiles;
    if (connectionProfiles == null || connectionProfiles.length === 0) {
      listSelectorItems = [];
    } else {
      const mostRecentClassName = classnames('list-item', {
        selected: this.props.indexOfSelectedConnectionProfile === 0,
      });

      defaultConnectionProfileList = (
        <div className="block select-list">
          <ol className="list-group" style={{marginTop: 0}}>
            <li
              className={mostRecentClassName}
              onClick={this._onDefaultProfileClicked}
              onDoubleClick={this.props.onConfirm}>
              <span
                className="icon icon-info pull-right connection-details-icon-info"
                ref={addTooltip({
                  // Intentionally *not* an arrow function so the jQuery Tooltip plugin can set the
                  // context to the Tooltip instance.
                  placement() {
                    // Atom modals have z indices of 9999. This Tooltip needs to stack on top of the
                    // modal; beat the modal's z-index.
                    this.tip.style.zIndex = 10999;
                    return 'right';
                  },
                  title:
                    'The settings most recently used to connect. To save settings permanently, '
                    + 'create a profile.',
                })}></span>
              Most Recent
            </li>
          </ol>
          <HR />
        </div>
      );

      listSelectorItems = connectionProfiles.slice(1).map((profile, index) => {
        // Use the index of each profile as its id. This is safe because the
        // items are immutable (within this React component).
        return {
          deletable: profile.deletable,
          displayTitle: profile.displayTitle,
          id: String(index),
          saveable: profile.saveable,
        };
      });
    }

    // The default profile is sliced from the Array to render it separately, which means
    // decrementing the effective index into the Array passed to the `MutableListSelector`.
    let idOfSelectedItem = (this.props.indexOfSelectedConnectionProfile == null)
      ? null
      : this.props.indexOfSelectedConnectionProfile - 1;
    if (idOfSelectedItem === null || idOfSelectedItem < 0) {
      idOfSelectedItem = null;
    } else {
      idOfSelectedItem = String(idOfSelectedItem);
    }

    return (
      <div className="nuclide-connection-details-prompt container-fluid">
        <div className="row" style={{display: 'flex'}}>
          <div className="connection-profiles col-xs-3 inset-panel">
            {defaultConnectionProfileList}
            <h6>Profiles</h6>
            <MutableListSelector
              items={listSelectorItems}
              idOfSelectedItem={idOfSelectedItem}
              onItemClicked={this._onProfileClicked}
              onItemDoubleClicked={this.props.onConfirm}
              onAddButtonClicked={this.props.onAddProfileClicked}
              onDeleteButtonClicked={this._onDeleteProfileClicked}
            />
          </div>
          <div className="connection-details-form col-xs-9">
            <ConnectionDetailsForm
              initialUsername={prefilledConnectionParams.username}
              initialServer={prefilledConnectionParams.server}
              initialRemoteServerCommand={prefilledConnectionParams.remoteServerCommand}
              initialCwd={prefilledConnectionParams.cwd}
              initialSshPort={prefilledConnectionParams.sshPort}
              initialPathToPrivateKey={prefilledConnectionParams.pathToPrivateKey}
              initialAuthMethod={prefilledConnectionParams.authMethod}
              initialDisplayTitle={prefilledConnectionParams.displayTitle}
              onConfirm={this.props.onConfirm}
              onCancel={this.props.onCancel}
              onDidChange={this._handleConnectionDetailsFormDidChange}
              ref="connection-details-form"
            />
          </div>
        </div>
      </div>
    );
  }
}