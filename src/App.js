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
      startedDraggingAt: 0,
      isDragging: false,
      activeCircle: null,
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

  transformCircles = (circles, x, y) => {
    _.map(circles, (circle, index) => {
      const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
        this.getPointerCoordinatesFromCentre(x, y),
        index,
        PARALLAX_AMOUNT_DIVISOR
      );

      circle.style.transform = `translateX(${ translateX }px) translateY(${ translateY }px)`;
    });
  }

  onMouseMove = (event) => {
    const { pageX, pageY } = event;
    let circles = document.getElementsByClassName('circle');

    if (circles.length) {
      this.transformCircles(circles, pageX, pageY);
    }

    if (this.state.activeCircle) {
      console.log('yeah');
      const multiplierForTranslateAmounts =
        this.state.activeCircle.id > MAX_CIRCLE_AMOUNT ?
          MAX_CIRCLE_AMOUNT : this.state.activeCircle.id;

      const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
        this.getPointerCoordinatesFromCentre(pageX, pageY),
        multiplierForTranslateAmounts,
        PARALLAX_AMOUNT_DIVISOR
      );

      let newCircles = this.state.circles;

      let activeCircleIndex = _.findIndex(newCircles, { id: this.state.activeCircle.id });

      const { pointerDistanceFromCircleCentre } = this.state.activeCircle;

      // Below is suffering a bit from parallax stuff — circles near the edge of the screen jump more when dragged

      let top = pageY - translateY - (newCircles[activeCircleIndex].height / 2) - pointerDistanceFromCircleCentre.y;
      let left = pageX - translateX - (newCircles[activeCircleIndex].width / 2) - pointerDistanceFromCircleCentre.x;

      newCircles[activeCircleIndex] = _.assign({}, newCircles[activeCircleIndex], {
        distanceAsPercent: {
          top: (top * 100) / window.innerHeight,
          left: (left * 100) / window.innerWidth,
        },
        top,
        left,
        translateX,
        translateY,
      });

      this.setState({ circles: newCircles });
    }
  }

  onMouseDown = (event) => {
    if (!_.includes(event.target.classList, 'circle')) this.setState({ activeCircle: null })
  }

  render() {
    return (
      <div id="content" className="content"
      onMouseMove={ (event) => {
        event.persist();
        _.throttle(this.onMouseMove.bind(this, event), 10)();
      } }
      onMouseDown={ this.onMouseDown }
      onMouseUp={ (event) => {
        if (this.state.activeCircle && event.timeStamp - this.state.activeCircle.activeAt > 200) {
          this.setState({ activeCircle: null });
        } else {
          this.makeCircle(event);
          this.setState({ activeCircle: null });
        };
      } }
      >
        <div className="content__overlay"></div>

        <CSSTransitionGroup
        transitionName="example"
        transitionEnterTimeout={200}
        transitionLeaveTimeout={1000}>
          { this.state.circles.map((circle, index) => {
            return (
              <div className="circle"
              id={ circle.id }
              key={ circle.id }
              onMouseDown={ (event) => {
                const { pageX, pageY } = event;

                let activeCircleCentreCoordinates = {
                  x: circle.left + (circle.width / 2),
                  y: circle.top + (circle.height / 2),
                }

                let pointerDistanceFromCircleCentre = {
                  x: pageX - activeCircleCentreCoordinates.x,
                  y: pageY - activeCircleCentreCoordinates.y,
                }

                this.setState({
                  activeCircle: {
                    id: circle.id,
                    activeAt: event.timeStamp,
                    pointerDistanceFromCircleCentre,
                  },
                });
              }}
              style={ {
                background: circle.background,
                transform: `translateX(${ circle.translateX }px) translateY(${ circle.translateY }px)`,
                top: `${ circle.top }px`,
                left: `${ circle.left }px`,
                width: circle.width,
                height: circle.height,
              } }>
                {/* <div style={{background: 'white', flex: '1 1 auto', fontSize: '15px', fontWeight: 'bold'}}>{circle.id}</div> */}
              </div>
            );
          }) }
        </CSSTransitionGroup>
      </div>
    );
  }
}

export default App;
