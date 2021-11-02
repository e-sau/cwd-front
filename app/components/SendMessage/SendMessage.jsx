import React from "react";
import Translate from "react-translate-component";
import NewIcon from "../NewIcon/NewIcon";
import WalletDb from "stores/WalletDb";
import WalletUnlockActions from "actions/WalletUnlockActions";
import AccountActions from "actions/AccountActions";
import AccountStore from "stores/AccountStore";
import { ChainStore } from "bitsharesjs";
import { connect } from "alt-react";


class SendMessage extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            isDisabled: true
        };
    }

    popupValidate() {
        let messageText = document.getElementById("messageText").value;

        if (messageText.length >= 1) {
            this.setState({
                isDisabled: false
            });
        } else {
            this.setState({
                isDisabled: true
            });
        }
    }


    isLocked() {
        let fromAccount = this.props.currentAccount.get("id");
        let toAccountId = this.props.toAccountId;
        let messageText = document.getElementById("messageText").value;
        
        if (this.props.currentAccount) {
            if (WalletDb.isLocked()) {
                WalletUnlockActions.unlock()
                    .then(() => {
                        AccountActions.tryToSetCurrentAccount();
                        AccountActions.sendMessage(
                            fromAccount,
                            toAccountId,
                            messageText
                        );
                    })
                    .catch(() => { });
            } else {
                AccountActions.sendMessage(
                    fromAccount,
                    toAccountId,
                    messageText
                );
            }
            this.props.closeModal();
        }
    }

    sendMessage() { }

    render() {
        let width = window.innerWidth;

        return (
            <div>
                <div className="send-message-popup">
                    <NewIcon
                        iconClass={"crowd-modal__close-modal-btn"}
                        iconWidth={40}
                        iconHeight={40}
                        iconName={"close_modal"}
                        onClick={this.props.closeModal}
                    />

                    <div className="send-message-popup__inner">
                        <Translate
                            className="send-message-popup__text"
                            content="send_message.message_text"
                        />

                        <textarea
                            className="send-message-popup__field"
                            type="text"
                            name="messageText"
                            id="messageText"
                            onChange={this.popupValidate.bind(this)}
                            rows={width > 576 ? "10" : "17"}
                        />
                    </div>

                    <button
                        className="send-message-popup__btn"
                        type="button"
                        onClick={this.isLocked.bind(this)}
                        disabled={this.state.isDisabled}
                    >
                        <Translate content="send_message.send_btn" />
                    </button>
                </div>
                {/* OVERLAY */}
                <div className="send-message-popup__overlay"></div>
            </div>
        );
    }
}

export default SendMessage = connect(SendMessage, {
    listenTo() {
        return [AccountStore];
    },
    getProps() {
        if (AccountStore.getState().passwordAccount) {
            return {
                currentAccount: ChainStore.fetchFullAccount(
                    AccountStore.getState().currentAccount ||
                        AccountStore.getState().passwordAccount
                )
            };
        }
    }
});
