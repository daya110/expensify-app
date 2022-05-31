import _ from 'underscore';
import lodashGet from 'lodash/get';
import React, {Component} from 'react';
import {withOnyx} from 'react-native-onyx';
import {View, Animated} from 'react-native';
import PropTypes from 'prop-types';
import CONST from '../../../CONST';
import ONYXKEYS from '../../../ONYXKEYS';
import reportActionPropTypes from './reportActionPropTypes';
import * as StyleUtils from '../../../styles/StyleUtils';
import PressableWithSecondaryInteraction from '../../../components/PressableWithSecondaryInteraction';
import Hoverable from '../../../components/Hoverable';
import ReportActionItemSingle from './ReportActionItemSingle';
import ReportActionItemGrouped from './ReportActionItemGrouped';
import IOUAction from '../../../components/ReportActionItem/IOUAction';
import ReportActionItemMessage from './ReportActionItemMessage';
import UnreadActionIndicator from '../../../components/UnreadActionIndicator';
import ReportActionItemMessageEdit from './ReportActionItemMessageEdit';
import ReportActionItemCreated from './ReportActionItemCreated';
import compose from '../../../libs/compose';
import withWindowDimensions, {windowDimensionsPropTypes} from '../../../components/withWindowDimensions';
import ControlSelection from '../../../libs/ControlSelection';
import canUseTouchScreen from '../../../libs/canUseTouchscreen';
import MiniReportActionContextMenu from './ContextMenu/MiniReportActionContextMenu';
import * as ReportActionContextMenu from './ContextMenu/ReportActionContextMenu';
import * as ContextMenuActions from './ContextMenu/ContextMenuActions';
import {withReportActionsDrafts} from '../../../components/OnyxProvider';
import RenameAction from '../../../components/ReportActionItem/RenameAction';
import colors from '../../../styles/colors';

const propTypes = {
    /** The ID of the report this action is on. */
    reportID: PropTypes.number.isRequired,

    /** All the data of the action item */
    action: PropTypes.shape(reportActionPropTypes).isRequired,

    /** Should the comment have the appearance of being grouped with the previous comment? */
    displayAsGroup: PropTypes.bool.isRequired,

    /** Is this the most recent IOU Action? */
    isMostRecentIOUReportAction: PropTypes.bool.isRequired,

    /** Whether there is an outstanding amount in IOU */
    hasOutstandingIOU: PropTypes.bool,

    /** Should we display the new indicator on top of the comment? */
    shouldDisplayNewIndicator: PropTypes.bool.isRequired,

    /** Position index of the report action in the overall report FlatList view */
    index: PropTypes.number.isRequired,

    /** Draft message - if this is set the comment is in 'edit' mode */
    draftMessage: PropTypes.string,

    /** Is the current item selected to scroll to */
    isSelected: PropTypes.bool,

    /** Callback for when the item is rendered */
    onItemRendered: PropTypes.func.isRequired,

    ...windowDimensionsPropTypes,
};

const defaultProps = {
    draftMessage: '',
    hasOutstandingIOU: false,
    isSelected: false,
};

class ReportActionItem extends Component {
    constructor(props) {
        super(props);
        this.popoverAnchor = undefined;
        this.state = {
            isContextMenuActive: ReportActionContextMenu.isActiveReportAction(props.action.reportActionID),
        };
        this.checkIfContextMenuActive = this.checkIfContextMenuActive.bind(this);
        this.showPopover = this.showPopover.bind(this);
        this.animatedBackgroundColor = new Animated.Value(0);
        const interpolatedBackgroundColor = this.animatedBackgroundColor.interpolate(
            {
                inputRange: [0, 1],
                outputRange: [colors.white, colors.honeydew],
            },
        );
        this.animatedBackgroundStyle = {
            backgroundColor: interpolatedBackgroundColor,
        };
    }

    componentDidMount() {
        this.props.onItemRendered(this.props.action.reportActionID);
    }

    shouldComponentUpdate(nextProps, nextState) {
        return this.props.displayAsGroup !== nextProps.displayAsGroup
            || this.props.draftMessage !== nextProps.draftMessage
            || this.props.isMostRecentIOUReportAction !== nextProps.isMostRecentIOUReportAction
            || this.props.hasOutstandingIOU !== nextProps.hasOutstandingIOU
            || this.props.shouldDisplayNewIndicator !== nextProps.shouldDisplayNewIndicator
            || !_.isEqual(this.props.action, nextProps.action)
            || !_.isEqual(this.props.isSelected, nextProps.isSelected)
            || this.state.isContextMenuActive !== nextState.isContextMenuActive;
    }

    componentDidUpdate(prevProps) {
        if (!prevProps.isSelected && this.props.isSelected) {
            this.animateBackground();
        }

        if (prevProps.draftMessage || !this.props.draftMessage) {
            return;
        }

        // Only focus the input when user edits a message, skip it for existing drafts being edited of the report.
        this.textInput.focus();
    }

    /**
     * Animate the background of the item
     */
    animateBackground() {
        Animated.timing(this.animatedBackgroundColor, {
            toValue: 1,
            duration: 0,
            useNativeDriver: false,
        }).start(() => {
            Animated.timing(this.animatedBackgroundColor, {
                toValue: 0,
                duration: 5500,
                useNativeDriver: false,
            }).start();
        });
    }

    /**
     * Show the ReportActionContextMenu modal popover.
     *
     * @param {Object} [event] - A press event.
     * @param {string} [selection] - A copy text.
     */
    showPopover(event, selection) {
        // Block menu on the message being Edited
        if (this.props.draftMessage) {
            return;
        }
        ReportActionContextMenu.showContextMenu(
            ContextMenuActions.CONTEXT_MENU_TYPES.REPORT_ACTION,
            event,
            selection,
            this.popoverAnchor,
            this.props.reportID,
            this.props.action,
            this.props.draftMessage,
            this.checkIfContextMenuActive,
            this.checkIfContextMenuActive,
        );
    }

    checkIfContextMenuActive() {
        this.setState({isContextMenuActive: ReportActionContextMenu.isActiveReportAction(this.props.action.reportActionID)});
    }

    render() {
        if (this.props.action.actionName === CONST.REPORT.ACTIONS.TYPE.CREATED) {
            return <ReportActionItemCreated reportID={this.props.reportID} />;
        }
        if (this.props.action.actionName === CONST.REPORT.ACTIONS.TYPE.RENAMED) {
            return <RenameAction action={this.props.action} />;
        }

        let children;
        if (this.props.action.actionName === CONST.REPORT.ACTIONS.TYPE.IOU) {
            children = (
                <IOUAction
                    chatReportID={this.props.reportID}
                    action={this.props.action}
                    isMostRecentIOUReportAction={this.props.isMostRecentIOUReportAction}
                />
            );
        } else {
            children = !this.props.draftMessage
                ? <ReportActionItemMessage action={this.props.action} />
                : (
                    <ReportActionItemMessageEdit
                            action={this.props.action}
                            draftMessage={this.props.draftMessage}
                            reportID={this.props.reportID}
                            index={this.props.index}
                            ref={el => this.textInput = el}
                            report={this.props.report}
                            blockedFromConcierge={this.props.blockedFromConcierge}
                    />
                );
        }

        return (
            <PressableWithSecondaryInteraction
                ref={el => this.popoverAnchor = el}
                onPressIn={() => this.props.isSmallScreenWidth && canUseTouchScreen() && ControlSelection.block()}
                onPressOut={() => ControlSelection.unblock()}
                onSecondaryInteraction={this.showPopover}
                preventDefaultContentMenu={!this.props.draftMessage}
                onKeyDown={(event) => {
                    // Blur the input after a key is pressed to keep the blue focus border from appearing
                    event.target.blur();
                }}
            >
                <Hoverable resetsOnClickOutside>
                    {hovered => (
                        <Animated.View style={this.animatedBackgroundStyle}>
                            {this.props.shouldDisplayNewIndicator && (
                                <UnreadActionIndicator />
                            )}
                            <View
                                style={StyleUtils.getReportActionItemStyle(
                                    hovered
                                    || this.state.isContextMenuActive
                                    || this.props.draftMessage,
                                    this.props.action.isPending || this.props.action.error,
                                )}
                            >
                                {!this.props.displayAsGroup
                                    ? (
                                        <ReportActionItemSingle action={this.props.action} showHeader={!this.props.draftMessage}>
                                            {children}
                                        </ReportActionItemSingle>
                                    )
                                    : (
                                        <ReportActionItemGrouped>
                                            {children}
                                        </ReportActionItemGrouped>
                                    )}
                            </View>
                            <MiniReportActionContextMenu
                                reportID={this.props.reportID}
                                reportAction={this.props.action}
                                displayAsGroup={this.props.displayAsGroup}
                                isVisible={
                                    hovered
                                    && !this.state.isContextMenuActive
                                    && !this.props.draftMessage
                                }
                                draftMessage={this.props.draftMessage}
                            />
                        </Animated.View>
                    )}
                </Hoverable>
            </PressableWithSecondaryInteraction>
        );
    }
}
ReportActionItem.propTypes = propTypes;
ReportActionItem.defaultProps = defaultProps;

export default compose(
    withWindowDimensions,
    withReportActionsDrafts({
        propName: 'draftMessage',
        transformValue: (drafts, props) => {
            const draftKey = `${ONYXKEYS.COLLECTION.REPORT_ACTIONS_DRAFTS}${props.reportID}_${props.action.reportActionID}`;
            return lodashGet(drafts, draftKey, '');
        },
    }),
    withOnyx({
        blockedFromConcierge: {
            key: ONYXKEYS.NVP_BLOCKED_FROM_CONCIERGE,
        },
        report: {
            key: ({reportID}) => `${ONYXKEYS.COLLECTION.REPORT}${reportID}`,
        },
    }),
)(ReportActionItem);
