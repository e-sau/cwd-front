import React from "react";
import Translate from "react-translate-component";
import { Link } from "react-router-dom";
import TransferBTC from "./TransferBTC";
import { connect } from "alt-react";
import AccountStore from "stores/AccountStore";
import { ChainStore } from "bitsharesjs";
import { Apis } from "bitsharesjs-ws";
import ls from "common/localStorage";

let ss = new ls("__graphene__");

//STYLES
import "../scss/cwdgateway.scss";
import "../scss/gateways/gatewayBTC.scss";
import "../scss/gateways/gatewayTransfer.scss";

class GatewayBTC extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            currentAccount: this.props.account,
            userBalance: 0
        };

        this.getBalance = this.getBalance.bind(this);
    }

    componentDidMount() {
        if (this.props.account) {
            let currentAccount = this.state.currentAccount;
            let userID = currentAccount.get("id");

            this.getBalance(userID, "CROWD.BTC");
        } else {
            this.props.history.push("/create-account/password");
        }
    }

    getBalance(user, asset) {
        let precision;
        let assetID;

        Apis.instance()
            .db_api()
            .exec("get_assets", [[asset]])
            .then(assetObj => {
                precision = assetObj[0]["precision"];
                assetID = assetObj[0]["id"];

                Apis.instance()
                    .db_api()
                    .exec("get_account_balances", [user, [assetID]])
                    .then(accountObj => {
                        this.setState({
                            userBalance:
                                accountObj[0]["amount"] /
                                Math.pow(10, precision)
                        });
                    });
            });
    }

    render() {
        let apiUrl = ss.get("serviceApi");
        let userBalance = this.state.userBalance;

        return (
            <section className="cwd-common__wrap">
                <Link to="/finance-dashboard" className="cwdgateway__back-link">
                    <Translate
                        content="cwdgateway.back_btn"
                        className="cwd-btn__rounded"
                    />
                </Link>

                <div className="gatewayBTC__container">
                    <div>
                        <Translate
                            className="cwd-common__title"
                            content="cwdgateway.gateways.withdraw__title"
                        />
                        {userBalance > 0 ? (
                            <TransferBTC
                                transferAsset="1.3.3"
                                history={this.props.history}
                                account={this.props.account}
                            />
                        ) : (
                            <div className="gatewayBTC__wrap">
                                <Translate
                                    className="cwd-common__description"
                                    content="modal.withdraw.no_BTC_balance"
                                />
                                <a
                                    className="gatewayBTC__link"
                                    href={apiUrl + "/market/CROWD.BTC_CWD"}
                                    rel="noopener noreferrer"
                                >
                                    <Translate content="modal.withdraw.exchange_link" />
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        );
    }
}

export default GatewayBTC = connect(GatewayBTC, {
    listenTo() {
        return [AccountStore];
    },
    getProps() {
        if (AccountStore.getState().passwordAccount) {
            return {
                account: ChainStore.fetchFullAccount(
                    AccountStore.getState().passwordAccount
                )
            };
        }
    }
});
