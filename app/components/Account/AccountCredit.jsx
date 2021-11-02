import React from "react";
import Translate from "react-translate-component";
import WalletDb from "stores/WalletDb";
import WalletUnlockActions from "actions/WalletUnlockActions";
import AccountActions from "actions/AccountActions";
import {Apis} from "bitsharesjs-ws";
import {ProgressBar} from "react-bootstrap";

require("./scss/crowd-credit.scss");

class AccountCredit extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            creditLimit: 0,
            total_credit: 0,
            account: this.props.account.get("id"),
            isCreditValid: true,
            intervalID: 0
        };

        this.getCreditData = this.getCreditData.bind(this);
        this.receiveCredit = this.receiveCredit.bind(this);
        this.onAmountChange = this.onAmountChange.bind(this);
    }

    componentDidMount() {
        if (this.state.account) {
            this.getCreditData();

            this.setState({
                intervalID: setInterval(this.getCreditData.bind(this), 5000)
            });
        } else {
            this.props.history.push("/create-account/password");
        }
    }

    componentWillUnmount() {
        clearInterval(this.state.intervalID);
    }

    onAmountChange() {
        this.setState({
            isCreditValid: true
        });
    }

    getCreditData() {
        Apis.instance()
            .db_api()
            .exec("get_full_accounts", [[this.props.account.get("id")], false])
            .then(stat => {
                let first_month_income = parseInt(
                    stat[0][1].statistics.first_month_income
                );
                let second_month_income = parseInt(
                    stat[0][1].statistics.second_month_income
                );
                let third_month_income = parseInt(
                    stat[0][1].statistics.third_month_income
                );
                let total_credit = parseInt(stat[0][1].statistics.total_credit);
                let allowed_to_repay = parseInt(
                    stat[0][1].statistics.allowed_to_repay
                );

                this.setState({
                    creditLimit:
                        first_month_income +
                        second_month_income +
                        third_month_income,
                    total_credit: total_credit,
                    allowed_to_repay: allowed_to_repay
                });
            });
    }

    receiveCredit(debitor) {
        let debitorId = debitor;
        let amount = document.getElementById("userCreditAmount").value * 100000;
        let creditLimit = this.state.creditLimit;

        if (amount > creditLimit) {
            this.setState({
                isCreditValid: false
            });
        } else {
            if (this.props.account) {
                if (WalletDb.isLocked()) {
                    WalletUnlockActions.unlock()
                        .then(() => {
                            AccountActions.tryToSetCurrentAccount();
                            AccountActions.credit_system_get(debitorId, amount);
                        })
                        .catch(() => {});
                } else {
                    AccountActions.credit_system_get(debitorId, amount);
                }
            }
        }
    }

    render() {
        let creditLimit = Math.floor(this.state.creditLimit / 100000);
        let total_credit = this.state.total_credit / 100000;
        let allowed_to_repay = this.state.allowed_to_repay / 100000;
        let debitor = this.state.account;
        let progressPercent = Math.floor(
            (allowed_to_repay / total_credit) * 100
        );

        return (
            <section className="crowd-credit__wrap">
                <Translate
                    className="cwd-common__description"
                    content="account.vesting.credit_description"
                />

                {total_credit > 0 ? (
                    <div className="crowd-credit__repayment-wrap">
                        <div className="crowd-credit__repayment-inner">
                            <Translate
                                className="crowd-credit__repayment-text"
                                content="account.vesting.repayment_progress"
                            />
                            <span className="crowd-credit__repayment-text--amount">
                                {" "}
                                {total_credit} CWD
                            </span>
                        </div>

                        <div className="crowd-credit__repayment-inner">
                            <Translate
                                className="crowd-credit__repayment-text"
                                content="account.vesting.allowed_to_repay"
                            />
                            <span className="crowd-credit__repayment-text--amount">
                                {" "}
                                {allowed_to_repay} CWD
                            </span>
                        </div>

                        <ProgressBar
                            now={allowed_to_repay}
                            max={total_credit}
                            label={
                                progressPercent > 7
                                    ? `${progressPercent}%`
                                    : null
                            }
                            animated
                        />
                    </div>
                ) : (
                    <div className="crowd-credit__credit-block">
                        <div className="crowd-credit__text-row">
                            <Translate
                                className="crowd-credit__text"
                                content="account.vesting.credit_text"
                            />
                            <span className="crowd-credit__amount">
                                {creditLimit}
                                {" CWD"}
                            </span>
                        </div>

                        <div className="crowd-credit__text-row crowd-credit__text-row--validator">
                            <Translate
                                className="crowd-credit__text"
                                content="account.vesting.credit_text_amount"
                            />
                            <input
                                className="cwd-common__input"
                                type="number"
                                id="userCreditAmount"
                                onChange={this.onAmountChange.bind(this)}
                            />

                            {!this.state.isCreditValid ? (
                                <div className="invest__amount-error">
                                    <Translate content="account.vesting.amount_error" />{" "}
                                    <span>{creditLimit} CWD</span>
                                </div>
                            ) : null}
                        </div>

                        {creditLimit > 0 ? (
                            <button
                                className="cwd-btn__asset-btn"
                                onClick={this.receiveCredit.bind(this, debitor)}
                            >
                                <Translate content="account.vesting.receive_credit" />
                            </button>
                        ) : null}
                    </div>
                )}
            </section>
        );
    }
}

export default AccountCredit;
