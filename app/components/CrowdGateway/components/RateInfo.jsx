import React from "react";
import Translate from "react-translate-component";

//STYLES
import "../scss/rate-data.scss";

class RateInfo extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            rateData: {},
            intervalID: 0
        }
    }

    componentDidMount() {
        this.getRateData();

        this.setState({
            intervalID: setInterval(this.getRateData.bind(this), 5000)
        });
    }

    componentWillUnmount() {
        clearInterval(this.state.intervalID);
    }

    getRateData() {
        let host = window.location.hostname;
        if (["127.0.0", "192.168"].includes(host.substring(0, 7))) {
            host = "backup.cwd.global"
        }

        let url = "https://" + host + "/static/gateway-stats.json";

        fetch(url)
            .then(response => response.json())
            .then(data => {
                this.setState({
                    rateData: data
                });
            });
    }

    selectRow(rowId, e) {
        var elems = document.getElementsByClassName("rate-data__row");
        for (var i = 0; i < elems.length; i++) {
            elems[i].classList.remove("rate-data__row--active");
        }
        document.getElementById(rowId).classList.add("rate-data__row--active")
    }

    render() {
        let {rateData} = this.state;

        return (
            <div className="rate-data__wrap">
                <Translate
                    className="rate-data__title"
                    content="cwdgateway.rateData.title"
                />

                <section className="rate-data__table">
                    <div className="rate-data__header">
                        <Translate content="cwdgateway.rateData.table.header_01" className="rate-data__table-title" />
                        <Translate content="cwdgateway.rateData.table.header_02" className="rate-data__table-title" />
                        <Translate content="cwdgateway.rateData.table.header_03" className="rate-data__table-title" />
                        <span className="rate-data__table-title">Min</span>
                        <span className="rate-data__table-title">Max</span>
                    </div>

                    <div className="rate-data__body">
                        {Object.entries(rateData).map((rate) => (
                            <div
                                className="rate-data__row"
                                id={rate[0]}
                                key={rate[0]}
                                onClick={this.selectRow.bind(this, rate[0])}>
                                <span className="rate-data__cell rate-data__cell--no-border">{rate[1]["name"]}</span>
                                <span className="rate-data__cell">{rate[0]}</span>
                                <span className="rate-data__cell rate-data__cell--data rate-data__cell--average">{rate[1]["average"] ? rate[1]["average"] : "-"}</span>
                                <span className="rate-data__cell rate-data__cell--data">{rate[1]["min"] ? rate[1]["min"] : "-"}</span>
                                <span className="rate-data__cell rate-data__cell--data rate-data__cell--no-right-border">{rate[1]["max"] ? rate[1]["max"] : "-"}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div >
        );
    }
}

export default RateInfo;
