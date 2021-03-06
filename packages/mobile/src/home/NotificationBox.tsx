import SimpleMessagingCard from '@celo/react-components/components/SimpleMessagingCard'
import progressDotsStyle from '@celo/react-components/styles/progressDots'
import variables from '@celo/react-components/styles/variables'
import * as React from 'react'
import { WithTranslation } from 'react-i18next'
import { NativeScrollEvent, ScrollView, StyleSheet, View } from 'react-native'
import { connect } from 'react-redux'
import { dismissEarnRewards, dismissGetVerified, dismissInviteFriends } from 'src/account/actions'
import { getIncomingPaymentRequests, getOutgoingPaymentRequests } from 'src/account/selectors'
import { PaymentRequest } from 'src/account/types'
import { AnalyticsEvents } from 'src/analytics/Events'
import ValoraAnalytics from 'src/analytics/ValoraAnalytics'
import { PROMOTE_REWARDS_APP } from 'src/config'
import { EscrowedPayment } from 'src/escrow/actions'
import EscrowedPaymentReminderSummaryNotification from 'src/escrow/EscrowedPaymentReminderSummaryNotification'
import { getReclaimableEscrowPayments } from 'src/escrow/reducer'
import { pausedFeatures } from 'src/flags'
import { Namespaces, withTranslation } from 'src/i18n'
import { backupKey, getVerified, inviteFriends, learnCelo } from 'src/images/Images'
import { InviteDetails } from 'src/invite/actions'
import { inviteesSelector } from 'src/invite/reducer'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import IncomingPaymentRequestSummaryNotification from 'src/paymentRequest/IncomingPaymentRequestSummaryNotification'
import OutgoingPaymentRequestSummaryNotification from 'src/paymentRequest/OutgoingPaymentRequestSummaryNotification'
import { RootState } from 'src/redux/reducers'
import { isBackupTooLate } from 'src/redux/selectors'
import { navigateToVerifierApp } from 'src/utils/linking'

interface StateProps {
  backupCompleted: boolean
  numberVerified: boolean
  goldEducationCompleted: boolean
  dismissedEarnRewards: boolean
  dismissedInviteFriends: boolean
  dismissedGetVerified: boolean
  incomingPaymentRequests: PaymentRequest[]
  outgoingPaymentRequests: PaymentRequest[]
  backupTooLate: boolean
  reclaimableEscrowPayments: EscrowedPayment[]
  invitees: InviteDetails[]
}

interface DispatchProps {
  dismissEarnRewards: typeof dismissEarnRewards
  dismissInviteFriends: typeof dismissInviteFriends
  dismissGetVerified: typeof dismissGetVerified
}

type Props = DispatchProps & StateProps & WithTranslation

const mapStateToProps = (state: RootState): StateProps => ({
  backupCompleted: state.account.backupCompleted,
  numberVerified: state.app.numberVerified,
  goldEducationCompleted: state.goldToken.educationCompleted,
  incomingPaymentRequests: getIncomingPaymentRequests(state),
  outgoingPaymentRequests: getOutgoingPaymentRequests(state),
  dismissedEarnRewards: state.account.dismissedEarnRewards,
  dismissedInviteFriends: state.account.dismissedInviteFriends,
  dismissedGetVerified: state.account.dismissedGetVerified,
  backupTooLate: isBackupTooLate(state),
  reclaimableEscrowPayments: getReclaimableEscrowPayments(state),
  invitees: inviteesSelector(state),
})

const mapDispatchToProps = {
  dismissEarnRewards,
  dismissInviteFriends,
  dismissGetVerified,
}

interface State {
  currentIndex: number
}

export class NotificationBox extends React.Component<Props, State> {
  state = {
    currentIndex: 0,
  }

  escrowedPaymentReminderNotification = () => {
    const { reclaimableEscrowPayments, invitees } = this.props
    if (reclaimableEscrowPayments && reclaimableEscrowPayments.length) {
      return [
        <EscrowedPaymentReminderSummaryNotification
          key={1}
          payments={reclaimableEscrowPayments}
          invitees={invitees}
        />,
      ]
    }
    return []
  }

  incomingPaymentRequestsNotification = (): Array<React.ReactElement<any>> => {
    const { incomingPaymentRequests } = this.props
    if (incomingPaymentRequests && incomingPaymentRequests.length) {
      return [
        <IncomingPaymentRequestSummaryNotification key={1} requests={incomingPaymentRequests} />,
      ]
    }
    return []
  }

  outgoingPaymentRequestsNotification = (): Array<React.ReactElement<any>> => {
    const { outgoingPaymentRequests } = this.props
    if (outgoingPaymentRequests && outgoingPaymentRequests.length) {
      return [
        <OutgoingPaymentRequestSummaryNotification key={1} requests={outgoingPaymentRequests} />,
      ]
    }
    return []
  }

  generalNotifications = (): Array<React.ReactElement<any>> => {
    const {
      t,
      backupCompleted,
      numberVerified,
      goldEducationCompleted,
      dismissedEarnRewards,
      dismissedInviteFriends,
      dismissedGetVerified,
    } = this.props
    const actions = []

    if (!backupCompleted) {
      actions.push({
        title: t('backupKeyFlow6:yourBackupKey'),
        text: t('backupKeyFlow6:backupKeyNotification'),
        icon: backupKey,
        callToActions: [
          {
            text: t('backupKeyFlow6:introPrimaryAction'),
            onPress: () => {
              ValoraAnalytics.track(AnalyticsEvents.get_backup_key)
              navigate(Screens.BackupIntroduction)
            },
          },
        ],
      })
    }

    if (!dismissedGetVerified && !numberVerified) {
      actions.push({
        title: t('nuxVerification2:notification.title'),
        text: t('nuxVerification2:notification.body'),
        icon: getVerified,
        callToActions: [
          {
            text: t('nuxVerification2:notification.cta'),
            onPress: () => {
              navigate(Screens.VerificationEducationScreen)
            },
          },
          {
            text: t('global:remind'),
            onPress: () => {
              this.props.dismissGetVerified()
            },
          },
        ],
      })
    }

    if (!dismissedEarnRewards && PROMOTE_REWARDS_APP) {
      actions.push({
        title: t('walletFlow5:earnCeloRewards'),
        text: t('walletFlow5:earnCeloGold'),
        icon: null,
        callToActions: [
          {
            text: t('walletFlow5:startEarning'),
            onPress: () => {
              this.props.dismissEarnRewards()
              ValoraAnalytics.track(AnalyticsEvents.celorewards_notification_confirm)
              navigateToVerifierApp()
            },
          },
          {
            text: t('maybeLater'),
            onPress: () => {
              this.props.dismissEarnRewards()
              ValoraAnalytics.track(AnalyticsEvents.celorewards_notification_dismiss)
            },
          },
        ],
      })
    }

    if (!goldEducationCompleted) {
      actions.push({
        title: t('global:celoGold'),
        text: t('exchangeFlow9:whatIsGold'),
        icon: learnCelo,
        callToActions: [
          {
            text: t('learnMore'),
            onPress: () => {
              ValoraAnalytics.track(AnalyticsEvents.celogold_notification_confirm)
              navigate(Screens.GoldEducation)
            },
          },
          {
            text: t('global:dismiss'),
            onPress: () => {
              ValoraAnalytics.track(AnalyticsEvents.celogold_notification_dismiss)
            },
          },
        ],
      })
    }

    if (!dismissedInviteFriends && !pausedFeatures.INVITE) {
      actions.push({
        title: t('inviteFlow11:inviteFriendsToCelo'),
        text: t('inviteFlow11:inviteAnyone'),
        icon: inviteFriends,
        callToActions: [
          {
            text: t('global:connect'),
            onPress: () => {
              this.props.dismissInviteFriends()
              ValoraAnalytics.track(AnalyticsEvents.invitefriends_notification_confirm)
              navigate(Screens.Invite)
            },
          },
          {
            text: t('global:remind'),
            onPress: () => {
              this.props.dismissInviteFriends()
              ValoraAnalytics.track(AnalyticsEvents.invitefriends_notification_dismiss)
            },
          },
        ],
      })
    }

    return actions.map((notification, i) => <SimpleMessagingCard key={i} {...notification} />)
  }

  paginationDots = (notifications: Array<React.ReactElement<any>>) => {
    if (notifications.length < 2) {
      return null
    }
    return (
      <View style={styles.pagination}>
        {notifications.map((n, i) => {
          return (
            <View
              key={i}
              style={
                this.state.currentIndex === i
                  ? progressDotsStyle.circleActive
                  : progressDotsStyle.circlePassive
              }
            />
          )
        })}
      </View>
    )
  }

  handleScroll = (event: { nativeEvent: NativeScrollEvent }) => {
    this.setState({
      currentIndex: Math.round(event.nativeEvent.contentOffset.x / variables.width),
    })
  }

  render() {
    const notifications = [
      ...this.incomingPaymentRequestsNotification(),
      ...this.outgoingPaymentRequestsNotification(),
      ...this.escrowedPaymentReminderNotification(),
      ...this.generalNotifications(),
    ]

    if (!notifications || !notifications.length) {
      // No notifications, no slider
      return null
    }
    return (
      <View style={styles.body}>
        <ScrollView
          horizontal={true}
          pagingEnabled={true}
          showsHorizontalScrollIndicator={false}
          onScroll={this.handleScroll}
        >
          {notifications.map((notification, i) => (
            <View key={i} style={styles.notificationContainer}>
              {notification}
            </View>
          ))}
        </ScrollView>
        {this.paginationDots(notifications)}
      </View>
    )
  }
}

const styles = StyleSheet.create({
  body: {
    maxWidth: variables.width,
    width: variables.width,
  },
  notificationContainer: {
    width: variables.width - 2 * variables.contentPadding,
    margin: variables.contentPadding,
    marginBottom: 24, // Enough space so the shadow is not clipped
  },
  pagination: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: variables.contentPadding,
    alignItems: 'center',
  },
})

export default connect<StateProps, DispatchProps, {}, RootState>(
  mapStateToProps,
  mapDispatchToProps
)(withTranslation<Props>(Namespaces.walletFlow5)(NotificationBox))
