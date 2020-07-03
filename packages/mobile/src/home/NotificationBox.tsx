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
import { HomeEvents } from 'src/analytics/Events'
import { ScrollDirection } from 'src/analytics/types'
import ValoraAnalytics from 'src/analytics/ValoraAnalytics'
import { PROMOTE_REWARDS_APP } from 'src/config'
import { EscrowedPayment } from 'src/escrow/actions'
import EscrowedPaymentReminderSummaryNotification from 'src/escrow/EscrowedPaymentReminderSummaryNotification'
import { getReclaimableEscrowPayments } from 'src/escrow/reducer'
import { pausedFeatures } from 'src/flags'
import { Namespaces, withTranslation } from 'src/i18n'
import BackupKeyIcon from 'src/icons/BackupKeyIcon'
import { getVerifiedIcon, homeIcon, inviteFriendsIcon, rewardsAppIcon } from 'src/images/Images'
import { InviteDetails } from 'src/invite/actions'
import { inviteesSelector } from 'src/invite/reducer'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import IncomingPaymentRequestSummaryNotification from 'src/paymentRequest/IncomingPaymentRequestSummaryNotification'
import OutgoingPaymentRequestSummaryNotification from 'src/paymentRequest/OutgoingPaymentRequestSummaryNotification'
import { RootState } from 'src/redux/reducers'
import { isBackupTooLate } from 'src/redux/selectors'
import { navigateToVerifierApp } from 'src/utils/linking'

export enum NotificationBannerTypes {
  incoming_tx_request = 'incoming_tx_request',
  outgoing_tx_request = 'outgoing_tx_request',
  escrow_tx_summary = 'escrow_tx_summary',
  escrow_tx_pending = 'escrow_tx_pending',
  celo_asset_education = 'celo_asset_education',
  celo_rewards_education = 'celo_rewards_education',
  invite_prompt = 'invite_prompt',
  verification_prompt = 'verification_prompt',
  backup_prompt = 'backup_prompt',
}

export enum NotificationBannerCTATypes {
  accept = 'accept',
  decline = 'decline',
  review = 'review',
  reclaim = 'reclaim',
  remind = 'remind',
  pay = 'pay',
}

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
        icon: <BackupKeyIcon height={40} width={40} />,
        callToActions: [
          {
            text: t('backupKeyFlow6:getBackupKey'),
            onPress: () => {
              ValoraAnalytics.track(HomeEvents.notification_select, {
                notificationType: NotificationBannerTypes.backup_prompt,
                selectedAction: NotificationBannerCTATypes.accept,
              })
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
        icon: getVerifiedIcon,
        callToActions: [
          {
            text: t('nuxVerification2:notification.cta'),
            onPress: () => {
              ValoraAnalytics.track(HomeEvents.notification_select, {
                notificationType: NotificationBannerTypes.verification_prompt,
                selectedAction: NotificationBannerCTATypes.accept,
              })
              navigate(Screens.VerificationEducationScreen)
            },
          },
          {
            text: t('maybeLater'),
            onPress: () => {
              ValoraAnalytics.track(HomeEvents.notification_select, {
                notificationType: NotificationBannerTypes.verification_prompt,
                selectedAction: NotificationBannerCTATypes.decline,
              })
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
        icon: rewardsAppIcon,
        callToActions: [
          {
            text: t('walletFlow5:startEarning'),
            onPress: () => {
              this.props.dismissEarnRewards()
              ValoraAnalytics.track(HomeEvents.notification_select, {
                notificationType: NotificationBannerTypes.celo_rewards_education,
                selectedAction: NotificationBannerCTATypes.accept,
              })
              navigateToVerifierApp()
            },
          },
          {
            text: t('maybeLater'),
            onPress: () => {
              this.props.dismissEarnRewards()
              ValoraAnalytics.track(HomeEvents.notification_select, {
                notificationType: NotificationBannerTypes.celo_rewards_education,
                selectedAction: NotificationBannerCTATypes.decline,
              })
            },
          },
        ],
      })
    }

    if (!goldEducationCompleted) {
      actions.push({
        title: t('global:celoGold'),
        text: t('exchangeFlow9:whatIsGold'),
        icon: homeIcon,
        callToActions: [
          {
            text: t('exchange'),
            onPress: () => {
              ValoraAnalytics.track(HomeEvents.notification_select, {
                notificationType: NotificationBannerTypes.celo_asset_education,
                selectedAction: NotificationBannerCTATypes.accept,
              })
              navigate(Screens.GoldEducation)
            },
          },
          {
            text: t('maybeLater'),
            onPress: () => {
              ValoraAnalytics.track(HomeEvents.notification_select, {
                notificationType: NotificationBannerTypes.celo_asset_education,
                selectedAction: NotificationBannerCTATypes.decline,
              })
            },
          },
        ],
      })
    }

    if (!dismissedInviteFriends && !pausedFeatures.INVITE) {
      actions.push({
        title: t('inviteFlow11:inviteFriendsToCelo'),
        text: t('inviteFlow11:inviteAnyone'),
        icon: inviteFriendsIcon,
        callToActions: [
          {
            text: t('global:inviteFriends'),
            onPress: () => {
              this.props.dismissInviteFriends()
              ValoraAnalytics.track(HomeEvents.notification_select, {
                notificationType: NotificationBannerTypes.invite_prompt,
                selectedAction: NotificationBannerCTATypes.accept,
              })
              navigate(Screens.Invite)
            },
          },
          {
            text: t('maybeLater'),
            onPress: () => {
              this.props.dismissInviteFriends()
              ValoraAnalytics.track(HomeEvents.notification_select, {
                notificationType: NotificationBannerTypes.invite_prompt,
                selectedAction: NotificationBannerCTATypes.decline,
              })
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
    const { currentIndex } = this.state
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / variables.width)

    if (nextIndex === currentIndex) {
      return
    }

    const direction = nextIndex > currentIndex ? ScrollDirection.next : ScrollDirection.previous
    ValoraAnalytics.track(HomeEvents.notification_scroll, { direction })

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

    if (!notifications.length) {
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
