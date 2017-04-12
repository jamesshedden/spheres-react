import React, { Component } from 'react';
import _ from 'lodash';
import CSSTransitionGroup from 'react-transition-group/CSSTransitionGroup';
import './App.css';

let COUNTER = 0;

const MAX_CIRCLE_AMOUNT = 12;
const PARALLAX_AMOUNT_DIVISOR = 80;

const COLORS = ['#FF9E9E', '#9EFFC6', '#9EEFFF', '#D8CEFF', '#B6FF9E'];

class App extends Component {
  constructor() {
    super();

    this.state = {
      circles: [],
      backgroundColor1: 'FEB522',
      backgroundColor2: 'A1FFFC',
    };
  }

  componentDidMount() {
    window.addEventListener("resize", this.throttledWindowResize); // TODO: remove event listener on unmount
  }

  throttledWindowResize = () => {
    _.throttle(this.onWindowResize, 10)();
  }

  onWindowResize = () => {
    const circles = _.map(this.state.circles, (circle) => {
      return _.assign({}, circle, {
        top: (window.innerHeight / 100) * circle.distanceAsPercent.top,
        left: (window.innerWidth / 100) * circle.distanceAsPercent.left,
      });
    })

    this.setState({ circles });
  }

  randomNumber = (min, max) => Math.floor(Math.random() * max) + min;

  getPointerCoordinatesFromCentre = (positionX, positionY) => {
    return {
      x: positionX - (window.innerWidth / 2),
      y: (window.innerHeight / 2) - positionY,
    };
  }

  getTranslateAmountsFromCoordinates = (coordinates, multiplierFromZero, divisor) => {
    const MULTIPLIER_BUFFER = 2;
    // multiplier comes from the counter, or the array index of a circle element, so
    // will sometimes be 0 or 1 but we don't want to multiply by these

    return {
      translateX: -(coordinates.x * (multiplierFromZero + MULTIPLIER_BUFFER)) / divisor,
      translateY: (coordinates.y * (multiplierFromZero + MULTIPLIER_BUFFER)) / divisor,
    };
  }

  makeCircle = (event) => {
    const randomDimension = this.randomNumber(100, 250);
    const multiplierForTranslateAmounts = COUNTER > MAX_CIRCLE_AMOUNT ? MAX_CIRCLE_AMOUNT : COUNTER;

    const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
      this.getPointerCoordinatesFromCentre(event.pageX, event.pageY),
      multiplierForTranslateAmounts,
      PARALLAX_AMOUNT_DIVISOR
    );

    let background = `
      linear-gradient(45deg, #523191 0%, ${ COLORS[this.randomNumber(0, COLORS.length)] } 100%)
    `;

    let circles = this.state.circles;
    let top = event.pageY - translateY - (randomDimension / 2);
    let left = event.pageX - translateX - (randomDimension / 2);

    circles.push({
      id: COUNTER,
      background,
      width: randomDimension,
      height: randomDimension,
      distanceAsPercent: {
        top: (top * 100) / window.innerHeight,
        left: (left * 100) / window.innerWidth,
      },
      top,
      left,
      translateX,
      translateY,
    });

    let newCircles = circles.length > MAX_CIRCLE_AMOUNT ? circles.slice(1, circles.length) : circles;
    this.setState({ circles: newCircles });
    COUNTER++;
  };

  onMouseMove = (event) => {
    const { pageX, pageY } = event;
    let circles = document.getElementsByClassName('circle');

    if (circles.length) {
      _.map(circles, (circle, index) => {
        const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
          this.getPointerCoordinatesFromCentre(pageX, pageY),
          index,
          PARALLAX_AMOUNT_DIVISOR
        );

        circle.style.transform = `translateX(${ translateX }px) translateY(${ translateY }px)`;
      });
    }
  }

  render() {
    return (
      <div id="content" className="content"
      onMouseMove={ (event) => {
        event.persist();
        _.throttle(this.onMouseMove.bind(this, event), 10)();
      } }
      onClick={ this.makeCircle }
      >
        <div className="content__overlay"></div>

        <CSSTransitionGroup
        transitionName="example"
        transitionEnterTimeout={200}
        transitionLeaveTimeout={1000}>
          { this.state.circles.map((circle) => {
            return (
              <div className="circle"
              key={ circle.id }
              style={ {
                background: circle.background,
                transform: `translateX(${ circle.translateX }px) translateY(${ circle.translateY }px)`,
                top: `${ circle.top }px`,
                left: `${ circle.left }px`,
                width: circle.width,
                height: circle.height,
              } } />
            );
          }) }
        </CSSTransitionGroup>
      </div>
    );
  }
}

export default App;
