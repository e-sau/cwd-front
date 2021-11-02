import React from "react";
import AccountActions from "actions/AccountActions";
import Translate from "react-translate-component";
import AmountSelector from "../../../Utility/AmountSelector";
import {ChainStore} from "bitsharesjs/es";
import {checkFeeStatusAsync} from "common/trxHelper";
import {debounce} from "lodash";
import {Asset} from "common/MarketClasses";
import NewIcon from "../../../NewIcon/NewIcon";
import {Apis} from "bitsharesjs-ws";
import WalletDb from "stores/WalletDb";
import WalletUnlockActions from "actions/WalletUnlockActions";

//STYLES
import "../scss/vesting-static-transfer.scss";

class VestingTransfer extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            asset: "CWD",
            memo: "",
            fee_asset_id: "1.3.0",
            feeAmount: new Asset({amount: 0}),
            userBalance: 0,
            intervalID: 0,
            currentAccount: this.props.currentAccount,
            amount: this.props.minDeposit,
            minDeposit: this.props.minDeposit,
            asset_id: this.props.transferAsset,
            toName: this.props.toName
        };

        this.onTrxIncluded = this.onTrxIncluded.bind(this);
        this.updateFee = debounce(this.updateFee.bind(this), 250);
        this.getBalance = this.getBalance.bind(this);
    }

    componentDidMount() {
        this.getBalance(this.props.currentAccount.get("id"), "SILVER");

        this.setState({
            intervalID: setInterval(
                this.getBalance.bind(
                    this,
                    this.props.currentAccount.get("id"),
                    "SILVER"
                ),
                5000
            )
        });

        this.nestedRef = null;
        this.updateFee();
    }

    componentWillUnmount() {
        clearInterval(this.state.intervalID);
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

    _setTotal(asset_id, balance_id) {
        const {feeAmount} = this.state;
        let balanceObject = ChainStore.getObject(balance_id);
        let transferAsset = ChainStore.getObject(asset_id);

        let balance = new Asset({
            amount: balanceObject.get("balance"),
            asset_id: transferAsset.get("id"),
            precision: transferAsset.get("precision")
        });

        if (balanceObject) {
            if (feeAmount.asset_id === balance.asset_id) {
                balance.minus(feeAmount);
            }
            this.setState({amount: balance.getAmount({real: true})});
        }
    }

    updateFee(state = this.state) {
        let {fee_asset_id, currentAccount} = state;
        const fee_asset_types = ["1.3.0"];
        if (
            fee_asset_types.length === 1 &&
            fee_asset_types[0] !== fee_asset_id
        ) {
            fee_asset_id = fee_asset_types[0];
        }
        if (!currentAccount) return null;
        checkFeeStatusAsync({
            accountID: currentAccount.get("id"),
            feeID: fee_asset_id,
            options: ["price_per_kbyte"],
            data: {
                type: "memo",
                content: state.memo
            }
        }).then(({fee, hasBalance, hasPoolBalance}) => {
            this.setState({
                feeAmount: fee,
                fee_asset_id: fee.asset_id,
                hasBalance,
                hasPoolBalance
            });
        });
    }

    onAmountChanged({amount, asset}) {
        if (!asset) {
            return;
        }
        this.setState({
            amount,
            asset,
            asset_id: asset.get("id")
        });
        this.getBalance(this.state.currentAccount.get("id"), "SILVER");
    }

    onTrxIncluded(confirm_store_state) {
        if (
            confirm_store_state.included &&
            confirm_store_state.broadcasted_transaction
        ) {
            TransactionConfirmStore.unlisten(this.onTrxIncluded);
            TransactionConfirmStore.reset();
        } else if (confirm_store_state.closed) {
            TransactionConfirmStore.unlisten(this.onTrxIncluded);
            TransactionConfirmStore.reset();
        }
    }

    setNestedRef(ref) {
        this.nestedRef = ref;
    }

    isWalletLocked() {
        if (WalletDb.isLocked()) {
            WalletUnlockActions.unlock()
                .then(() => {
                    AccountActions.tryToSetCurrentAccount();
                    this.onSubmit();
                })
                .catch(() => {});
        } else {
            this.onSubmit();
        }
    }

    onSubmit() {
        let amount = Math.round(this.state.amount * 100000);
        let accountID = this.state.currentAccount.get("id");

        AccountActions.exchangeSilver(accountID, amount).then(() => {
            TransactionConfirmStore.unlisten(this.onTrxIncluded);
            TransactionConfirmStore.listen(this.onTrxIncluded);
        });
    }

    render() {
        let {currentAccount, minDeposit, userBalance} = this.state;

        let transferAsset = this.props.transferAsset;

        let amount = parseFloat(this.state.amount);
        let fee = this.state.feeAmount.getAmount({real: true});
        let account_balances = currentAccount.get("balances").toJS();
        let width = window.innerWidth;

        let isDepositValid = amount >= minDeposit;
        let isAmountValid = 0 <= userBalance - amount;
        let isSubmitValid = isAmountValid && isDepositValid;

        return (
            <div>
                {userBalance > 0 ? (
                    <div className="static-transfer__wrap">
                        {width > 576 ? (
                            <div className="static-transfer__header">
                                <div className="static-transfer__header-item">
                                    <Translate
                                        className="static-transfer__header-text"
                                        content="static-transfer.avialiable_text"
                                    />
                                </div>
                                <div className="static-transfer__header-item">
                                    <Translate
                                        className="static-transfer__header-text"
                                        content="account.vesting.amount_to_withdraw"
                                    />
                                </div>
                                <div className="static-transfer__header-item">
                                    <Translate
                                        className="static-transfer__header-text"
                                        content="static-transfer.fee"
                                    />
                                </div>
                            </div>
                        ) : null}

                        <div className="static-transfer__body">
                            <div>
                                {width < 576 ? (
                                    <Translate
                                        className="static-transfer__header-text"
                                        content="static-transfer.avialiable_text"
                                    />
                                ) : null}

                                <div className="static-transfer__item">
                                    <div className="static-transfer__field-wrap">
                                        <div className="static-transfer__current-balance">
                                            {userBalance}
                                        </div>
                                        <span className="static-transfer__asset">
                                            SILVER
                                        </span>
                                    </div>

                                    <button
                                        disabled={
                                            userBalance == 0 ? true : false
                                        }
                                        className="static-transfer__push-btn"
                                        type="button"
                                        onClick={this._setTotal.bind(
                                            this,
                                            transferAsset,
                                            account_balances[transferAsset],
                                            fee,
                                            transferAsset
                                        )}
                                    >
                                        <NewIcon
                                            iconWidth={18}
                                            iconHeight={14}
                                            iconName={"btn_arrow"}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/*  AMOUNT   */}
                            <div>
                                {width < 576 ? (
                                    <Translate
                                        className="static-transfer__header-text"
                                        content="account.vesting.amount_to_withdraw"
                                    />
                                ) : null}
                                <div
                                    className={
                                        isSubmitValid
                                            ? "static-transfer__item static-transfer__item--amount"
                                            : "static-transfer__item static-transfer__item--amount static-transfer__item--amount-alert"
                                    }
                                >
                                    <AmountSelector
                                        amount={amount}
                                        onChange={this.onAmountChanged.bind(
                                            this
                                        )}
                                        asset={transferAsset}
                                        assets={[transferAsset]}
                                        min={minDeposit}
                                        inputId={"amountInput_" + minDeposit}
                                    />
                                    <span className="static-transfer__asset">
                                        SIlVER
                                    </span>

                                    <div
                                        className={
                                            isSubmitValid
                                                ? "static-transfer__min-block"
                                                : "static-transfer__min-block static-transfer__min-block--alert"
                                        }
                                    >
                                        {isAmountValid ? (
                                            <span>
                                                <Translate content="static-transfer.min" />{" "}
                                                {minDeposit}
                                                {" SILVER"}
                                            </span>
                                        ) : (
                                            <span>
                                                <Translate content="static-transfer.non_balance" />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                {width < 576 ? (
                                    <Translate
                                        className="static-transfer__header-text"
                                        content="static-transfer.fee"
                                    />
                                ) : null}
                                <div className="static-transfer__item static-transfer__item--submit">
                                    {/*  FEE   */}
                                    <div
                                        className="static-transfer__field-wrap static-transfer__field-wrap--fee"
                                        id="inputRoundWrap"
                                    >
                                        <AmountSelector
                                            refCallback={this.setNestedRef.bind(
                                                this
                                            )}
                                            disabled={true}
                                            amount={fee}
                                            asset={"1.3.0"}
                                            assets={["1.3.0"]}
                                            inputClass={
                                                "static-transfer__fee-field"
                                            }
                                        />

                                        <span className="static-transfer__asset">
                                            CWD
                                        </span>
                                    </div>

                                    {/*  SUBMIT   */}
                                    <button
                                        disabled={!isSubmitValid}
                                        className="cwd-btn__rounded cwd-btn__rounded--confirm"
                                        onClick={this.isWalletLocked.bind(this)}
                                    >
                                        <Translate content="static-transfer.send_btn" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="static-transfer__info-text">
                        <Translate content="account.vesting.non_balance_messege" />
                    </p>
                )}
            </div>
        );
    }
}

export default VestingTransfer;
